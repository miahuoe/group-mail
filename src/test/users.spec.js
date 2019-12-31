const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");

// https://medium.com/@hiennguyen_1188/testing-api-endpoints-in-express-js-293f1dc9e0ba

const randomString = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const login = randomString();
const password = randomString();
const email = randomString();

describe("/users", () => {
	// TODO drop database
	it("should reject too short login", (done) => {
		const req = {
			login: "m",
			password: "xd",
			email: "xd@xd.com"
		};
		request(app)
			.post("/api/users/register")
			.send(req)
			.expect(400, done);
	});
	it("should reject too short password", (done) => {
		const req = {
			login: "miahuoe",
			password: "xd",
			email: "xd@xd.com"
		};
		request(app)
			.post("/api/users/register")
			.send(req)
			.expect(400, done);
	});
	it("should reject incorrect email", (done) => {
		const req = {
			login: "miahuoe",
			password: "xd",
			email: "xd@xd"
		};
		request(app)
			.post("/api/users/register")
			.send(req)
			.expect(400, done);
	});
	it("should create an user", (done) => {
		const req = {
			login: login,
			password: password,
			email: email+"@xd.com"
		};
		request(app)
			.post("/api/users/register")
			.send(req)
			.expect(201, done);
	});
	it("should not login - incorrect login", (done) => {
		request(app)
			.post("/api/users/login")
			.auth(login+"xxxxxD", password)
			.expect(404, done);
	});
	it("should not login - incorrect password", (done) => {
		request(app)
			.post("/api/users/login")
			.auth(login, password+"xDDD")
			.expect(401, done);
	});
	it("should login", (done) => {
		request(app)
			.post("/api/users/login")
			.auth(login, password)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect((res) => {
				res.body.should.have.property("token");
			})
			.expect(200, done);
	});
})

// vim: noai:ts=4:sw=4
