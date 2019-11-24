const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");

// https://medium.com/@hiennguyen_1188/testing-api-endpoints-in-express-js-293f1dc9e0ba

describe("POST /users/register", function () {
	it("should create an user", function (done) {
		const req = {
			login: "miahuoe",
			password: "xd",
			email: "xd@xd.com"
		};
		request(app)
			.post("/api/users/register")
			.send(req)
			.expect(201, done);
	})
})

// vim: noai:ts=4:sw=4
