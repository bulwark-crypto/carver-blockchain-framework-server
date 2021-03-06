
# Development

You can use the following commands to pawn the basic namespaces. (These are all ran automatically without development flag)

- `docker-compose exec api bash -c "npm start API"` - Start Reservation API server (On port 3001). Once you initialize this you can access the frontend client via http://localhost:3000/
- `docker-compose exec sync bash -c "npm start SYNC"` - Start blockchain & data syncing. (This will require your chain to fully sync (See Logging and Monitoring section below.)

If you have `DEVELOPMENT=1` (Currently this is not functional but intended in the future) in .env file uncommented all services will run except Carver Framework contexts. This makes it easy to test spawn, restart and add new contexts as needed.

Visual Studio Code is suggested for development. You can use either Windows or Linux as the entire stack runs in Docker and you don't need to install any other software/frameworks locally.


# Logging and Monitoring

## Debugging backend

- `docker-compose exec sync bash -c "npm run debug SYNC"`. You will be able to debug via `chrome://inspect` in Chrome 

## Debugging coin

- Look at logs with `docker logs -f bwk --tail 10`. (Replace bwk with your coin container name)
- `docker-compose exec bwk bash -c "bulwark-cli -rpcconnect=172.25.0.110 getinfo"` to check sync status 
- `docker-compose exec bwk bash -c "bulwark-cli -rpcconnect=172.25.0.110 stop"` to gracefully shut down the wallet
- `docker-compose exec bwk bash -c "bulwark-cli -rpcconnect=172.25.0.110 stop && bulwarkd -reindex"` to reindex bwk in case of an error (On your next restart the chain will start from beginning)

## Database

- `docker-compose exec mongo bash -c "mongo"` to connect to mongo database. 
- `use carverFramework`
- `show collections`

## RabbitMQ

You can access RabbitMQ Management panel: http://localhost:15672/

You will need to create a user if you are using this as instructed here (Connect to RabbitMQ terminal via Docker): https://www.rabbitmq.com/management.html#cli-examples

## Debugging frontend

- Look at logs with `docker logs -f client --tail 10`
