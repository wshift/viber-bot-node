"use strict";

const crypto = require('crypto');

function MessageValidator(logger, authTokens) {
	this._logger = logger;
	this._authTokens = authTokens;
}

MessageValidator.prototype.validateMessage = function(serverSideSignature, message) {

	var validToken = null;
	for (let token of this._authTokens) {

		const calculatedHash = this._calculateHmacFromMessage(message, token);
		this._logger.debug("Validating signature '%s' == '%s for token '%s'", serverSideSignature, calculatedHash, token);
		if (serverSideSignature == calculatedHash) {
			validToken = token;
			break;
		}
	}

	return validToken;
};

MessageValidator.prototype._calculateHmacFromMessage = function(message, authToken) {
	return crypto.createHmac("sha256", authToken).update(message).digest("hex");
};

module.exports = MessageValidator;