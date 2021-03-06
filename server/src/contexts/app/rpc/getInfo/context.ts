import { Event } from '../../../../classes/interfaces/events'
import { Context, State } from '../../../../classes/interfaces/context'
import { withUnhandledCommand, withUnhandledCommandPayload } from '../../../../classes/logic/knownErrors'
import { withState, Reducer } from '../../../../classes/logic/withState'

/*
interface RpcPayload {
    res: any;
    err: any;
}

const checkRpcErrors = (err: string) => {
    if (!err) {
        return;
    }
    switch (typeof err) {
        case 'string':
            if (err.indexOf('ECONNREFUSED') === 0) {
                throw commonLanguage.errors.ConnectionRefused;
            }
            switch (err) {
                case 'Timed out':
                    // These are BITCOIND_TIMEOUT errors and should be ignored as we'll get another error after
                    return;
                case 'socket hang up':
                    throw commonLanguage.errors.SocketHangUp;
            }
            throw commonLanguage.errors.UnhandledRpcError;
        case 'number':
            switch (err) {
                case 401:
                    throw commonLanguage.errors.UnauthorizedCallResponseCode;
                default:
                    throw commonLanguage.errors.UnhandledResponseCode;
            }
    }

}*/

const withQueryRpcGetinfo: Reducer = ({ state, event }) => {
    const rpcGetInfo = event.payload;

    //@todo compare height and only emit if changed

    return withState(state)
        .set({
            last: rpcGetInfo
        })
        .emit({
            type: commonLanguage.events.Updated,
            payload: rpcGetInfo,// @todo store the info in permanent store and emit a lightweight event? (right now it emits rpcgetinfo )
        })

}

const withInitialize: Reducer = ({ state, event }) => {
    return withState(state)
        .query(commonLanguage.queries.GetLatestRpcGetInfo);
}

const reducer: Reducer = ({ state, event }) => {
    return withState(state)
        .reduce({ type: commonLanguage.commands.Initialize, event, callback: withInitialize })
        .reduce({ type: commonLanguage.queries.GetLatestRpcGetInfo, event, callback: withQueryRpcGetinfo });
}

const initialState = {
    blocks: 0
}

const commonLanguage = {
    type: 'RPC_GETINFO',
    commands: {
        Initialize: 'INITIALIZE'
    },
    events: {
        Updated: 'UPDATED'
    },
    queries: {
        GetLatestRpcGetInfo: 'LATEST_RPC_GET_INFO'
    },
    storage: {
        FindLast: 'FIND_LAST'
    },
    errors: {
        // Connection issues
        ConnectionRefused: 'Could not connect to RPC. Check your config host/port. (This is not a username/password issue).',
        SocketHangUp: 'RPC stocket hung up (Timeout). This usually occurs if the chain is still syncing. Please try again later.',

        // Compatability issues
        GetInfoUnsupportedFormat: 'RPC connected successfully but "getinfo" command returned data in unknown format.',

        // Unhandled errors
        UnhandledRpcError: 'RPC connected but returned unhandled RPC Error',
        UnauthorizedCallResponseCode: 'RPC connected but returned "Unauthorized (401)" error code. Check your config username/password.',
        UnhandledResponseCode: 'RPC connected but returned "Unauthorized (401)" error code. Check your config username/password.',

        ...withUnhandledCommand, // Add .UnhandledCommand error
        ...withUnhandledCommandPayload, // Add .withUnhandledCommandPayload error
    }
}

export default {
    initialState,
    reducer,
    commonLanguage
} 