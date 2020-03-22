
import { Event } from '../interfaces/events'

import { ReplayEventsParams } from '../interfaces/eventStore';

import * as amqp from "amqplib";
import * as uuidv4 from 'uuid/v4'

import { ContextStore, createRegisteredContext, RegisterContextResponse } from './contextStore'
import { RegisteredContext, RegisterContextParams } from './registeredContext'
import { Context } from '../interfaces/context';
import { config } from '../../../config';

import * as async from 'async';

interface ContextMapParams {
    id: string;
}
enum QueueType {
    EventStreamRequest = 'EVENT_STREAM_REQUEST',
    EventStreamResponse = 'EVENT_STREAM_RESPONSE',

    QueryRequest = 'QUERY_REQUEST',
    QueryResponse = 'QUERY_RESPONSE'
}

interface RemoteRegisteredContext {
    queryStorage: (query: string, payload?: any) => Promise<any>;
    streamEvents: (params: ReplayEventsParams) => Promise<void>;
    //disconnect: () => Promise<void>; //@todo
}
interface RemoteContextStoreParams {
    context?: any;
    id?: string;

    /**
     * When fetching remote contexts we need to tell where to stream replies back to (including queries and event streams)
     */
    replyToContext: RegisteredContext;
}
export interface RemoteContextStore {
    getRemote: (params: RemoteContextStoreParams) => Promise<RemoteRegisteredContext>;
    register: ({ id, context }: RegisterContextParams, options?: any) => Promise<RegisterContextResponse>;
    unregister: (params: RemoteContextStoreParams) => Promise<void>;
}

export interface ContextMap {
    getContextStore: (params: ContextMapParams) => Promise<RemoteContextStore>;
}

/*
How we use RabbitMQ messages in a nutshell:

dispatch (aka command) = basic push/pull
query = request/respond
stream events = request/reply
*/
const createContextMap = async (): Promise<ContextMap> => {
    const conn = await amqp.connect(config.rabbitmq.url);//@todo move to config (and this will be a docker container)
    const defaultChannel = await conn.createChannel();
    await defaultChannel.prefetch(1); // Limit each consumer to max processing of 1 message

    const bufferObject = (objectToBuffer: any) => {
        return Buffer.from(JSON.stringify(objectToBuffer))
    }
    const unbufferObject = <T>(msg: amqp.Message): T => {
        return JSON.parse(msg.content.toString())
    }

    const contextStores = new Map<string, RemoteContextStore>();

    const getContextStore = async ({ id: contextStoreId }: ContextMapParams): Promise<RemoteContextStore> => {

        // Use the context store from cache to avoid having to re-create a new one each time
        if (contextStores.has(contextStoreId)) {
            return contextStores.get(contextStoreId);
        }

        const contextStore = await createContextStore({ id: contextStoreId });
        contextStores.set(contextStoreId, contextStore);

        return contextStore;
    }
    const createContextStore = async ({ id: contextStoreId }: ContextMapParams): Promise<RemoteContextStore> => {
        const channel = defaultChannel; //@todo this can be specified on per-context store basis


        const getNetworkId = (context: Context, contextId: string) => {
            if (!context) {
                return `[${contextStoreId}][${contextId}]`;
            }

            return `[${contextStoreId}][${context.commonLanguage.type}]${!!contextId ? `[${contextId}]` : ''}`
        }

        const registeredContexts = new Set<RegisteredContext>();
        const registeredContextsById = new Map<string, RegisteredContext>(); // Allows quick access to a context by it's id

        const register = async ({ id: contextId, storeEvents, context }: RegisterContextParams) => {
            const id = getNetworkId(context, contextId);

            const { registeredContext, stateStore } = await createRegisteredContext({ id, storeEvents, context });

            registeredContexts.add(registeredContext);
            registeredContextsById.set(id, registeredContext);

            const queueName = id;

            console.log('register:', queueName);


            const eventStreamQueues = new Map<string, any>();

            await channel.assertQueue(queueName, { exclusive: true }); // this queue will be deleted after socket ends
            await channel.consume(queueName, async (msg) => {
                const { correlationId, replyTo } = msg.properties;

                switch (msg.properties.type) {
                    // Event stream requests queue (someone will ask for a set of events from a certain position)
                    case QueueType.EventStreamRequest:
                        const replayEventsParams = unbufferObject<ReplayEventsParams>(msg);

                        try {
                            //@todo would be great if we don't stream all events and do them in batches (ex: request 50 at a time). Otheriwse if consumer exits unexpectedly there will be a lot of wasted events.
                            //@todo it's possible to batch replies as well (ex: 5 events per message)
                            await registeredContext.streamEvents({
                                ...replayEventsParams,
                                callback: async (event) => {
                                    channel.sendToQueue(replyTo, bufferObject(event), {
                                        correlationId,
                                        type: QueueType.EventStreamResponse
                                    });
                                }
                            })

                            channel.ack(msg);
                        } catch (err) {
                            //@todo add deadletter queue?
                            //@todo how to handle failed queries?
                            channel.nack(msg, false, false); // Fail message and don't requeue it, go to next command
                        }
                        break;
                    case QueueType.QueryRequest:
                        const { type, payload } = unbufferObject<Event>(msg);

                        try {
                            const response = await registeredContext.query(type, payload);

                            channel.sendToQueue(replyTo, bufferObject(response), {
                                correlationId,
                                type: QueueType.QueryResponse
                            });

                            channel.ack(msg); // This command was processed without errors
                        } catch (err) {
                            console.log('** query error:', err);
                            //@todo add deadletter queue?
                            //@todo how to handle failed queries?
                            channel.nack(msg, false, false); // Fail message and don't requeue it, go to next command
                        }
                        break;

                    case QueueType.EventStreamResponse:
                        const event = unbufferObject<Event>(msg);

                        if (!registeredContext.correlationIdCallbacks.has(correlationId)) {
                            console.log(correlationId);
                            throw 'Event Stream Correlation Id Not Found';
                        }

                        // We don't want to await for each message (as an event can query so it'll deadlock waiting for a query as the event can't finish). We'll add it to queue and process one at a time.
                        if (!eventStreamQueues.has(event.type)) {
                            const eventStreamQueue = async.queue(async (event, callback) => {

                                const correlationIdCallback = registeredContext.correlationIdCallbacks.get(correlationId);

                                //@todo what to do when the event we're streaming throws an exception?
                                await correlationIdCallback(event);

                                callback();
                            });
                            eventStreamQueues.set(event.type, eventStreamQueue);
                        }

                        eventStreamQueues.get(event.type).push(event);

                        channel.ack(msg);

                        break;

                    case QueueType.QueryResponse:
                        const reply = unbufferObject<any>(msg);

                        if (!registeredContext.correlationIdCallbacks.has(correlationId)) {
                            console.log(correlationId);
                            throw 'Query Response Correlation Id Not Found';
                        }
                        const callbacks = registeredContext.correlationIdCallbacks.get(correlationId);

                        //@todo callbacks.reject(reply) with nack?
                        registeredContext.correlationIdCallbacks.delete(correlationId); // Queries are removed when they are completed
                        callbacks.resolve(reply);
                        channel.ack(msg);

                        break;
                    default:
                        throw 'Unknown queue type';
                }

            }, { noAck: false })

            return {
                registeredContext,
                stateStore
            }
        }

        const getRemote = async ({ context, id: contextId, replyToContext }: RemoteContextStoreParams) => {
            const id = getNetworkId(context, contextId);
            const remoteQueueName = id;

            const replyToId = replyToContext.id;
            const replyToQueueName = replyToId;

            const streamEvents = async (params: ReplayEventsParams) => {
                const correlationId = uuidv4();

                replyToContext.correlationIdCallbacks.set(correlationId, params.callback);

                const { type, sequence, sessionOnly } = params;
                const message = { type, sequence, sessionOnly };

                channel.sendToQueue(remoteQueueName, bufferObject(message), {
                    replyTo: replyToQueueName,
                    correlationId,
                    type: QueueType.EventStreamRequest
                })
            }

            const queryStorage = async (query: string, payload: any) => {
                const correlationId = uuidv4();
                const queryPromise = new Promise((resolve, reject) => {
                    replyToContext.correlationIdCallbacks.set(correlationId, { resolve, reject });
                });

                // Convert to Event and send to queue
                channel.sendToQueue(remoteQueueName, bufferObject({ type: query, payload }), {
                    correlationId, // When response comes back into the response queue we can identify for which callback
                    replyTo: replyToQueueName,
                    type: QueueType.QueryRequest
                });

                const reply = await queryPromise;

                return reply;
            }

            return {
                streamEvents,
                queryStorage
            }
        }

        const unregister = async ({ context, id: contextId }: RemoteContextStoreParams) => {
            const id = getNetworkId(context, contextId);

            console.log('@todo unregister:', id)
        }

        return {
            register,
            unregister,
            getRemote
        }
    }

    return {
        getContextStore
    }
}

export {
    createContextMap
}