"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const stream = require('stream');
const JSONBig = require('json-bigint')({"storeAsString": true});

function Middleware(logger, messageValidatorService) {
	this._logger = logger;
	this._stream = this._createStream();
	this._buffer = null;

	this._app = express();
	this._app.use(bodyParser.text({ type: "*/*" }));

	this._validateMessageSignature(messageValidatorService);
	this._configureEndpoints();
}

Middleware.prototype.getIncoming = function() {
	return this._app;
};

Middleware.prototype.getStream = function() {
	return this._stream;
};

Middleware.prototype._configureEndpoints = function() {
	const self = this;
	this._app.get("/ping", (request, response) => {
		response.send("pong");
		response.end();
	});

	this._app.post("/", (request, response) => {
		self._logger.debug("Request data:", request.body);

		const parsedBody = JSONBig.parse(request.body);
		parsedBody.authToken = request.authToken;

		self._stream.push(JSONBig.stringify(parsedBody));

		if (self._buffer) {
			response.send(self._buffer);
		}
		response.end();
	});
};

Middleware.prototype._createStream = function() {
	const self = this;
	const duplexStream = new stream.Duplex();

	duplexStream._read = function noop() {};
	duplexStream._write = (chunk, encoding, done) => {
		self._buffer = chunk.toString();
		done();
	};
	return duplexStream;
};

Middleware.prototype._validateMessageSignature = function(messageValidatorService) {
	const self = this;
	this._app.use((request, response, next) => {
		const serverSideSignature = request.headers.X_Viber_Content_Signature || request.query.sig;

		if (!serverSideSignature && ['/add', '/remove', '/list'].indexOf(request.path) >= 0) {
            next();
            return;
		}
		
		let validToken = messageValidatorService.validateMessage(serverSideSignature, request.body);
		if (!validToken) {
			self._logger.warn("Could not validate message signature", serverSideSignature);
			return;
		} else {
			request.authToken = validToken;
		}
		next();
	});
};

module.exports = Middleware;