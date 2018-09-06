# Homework Assignment #1

The Node.js Master Class

Create a simple "Hello World" API. Meaning:

1. It should be a RESTful JSON API that listens on a port of your choice.

2. When someone posts anything to the route /hello, you should return a welcome message, in JSON format. This message can be anything you want.

## Generate a cert

```
# go to app root folder
mkdir https
cd $_
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
```

A note. For `Common Name` use `localhost` for development needs only

## Start a server

In development mode

```
node index.js
```

In production mode

```
NODE_ENV=production node index.js
```

## Test server

In production

Run commands in a separate terminal window

```
curl -X POST -k http://localhost:5000/hello\?name\=Cat -d 'Cloud A'
curl -X POST -k https://localhost:5001/hello\?name\=Cat -d 'Cloud B'
```

Expect to get response

```
{"message":"Hello Cat Cloud A"}%
{"message":"Hello Cat Cloud B"}%
```
