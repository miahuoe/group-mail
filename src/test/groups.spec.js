const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");

const randomString = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

let login = randomString();
let password = randomString();
let email = randomString();
let token = "";
let group = {
	name: randomString(),
	maillocal: randomString(),
	description: randomString()
};
let groupId = 0;
let groups = [];

describe("/groups", () => {
	before(() => {

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
	it("should login", (done) => {
		request(app)
			.post("/api/users/login")
			.auth(login, password)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect((res) => {
				token = res.body.token;
			})
			.expect(200, done);
	});
	it("should get an empty list of groups", (done) => {
		request(app)
			.get("/api/groups")
			.set({
				Authorization: "Token "+token,
			})
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.be.empty;
				groups = res.body;
			})
			.expect(200, done);
	});
	it("should reject too short name", (done) => {
		request(app)
			.post("/api/groups")
			.set({
				Authorization: "Token "+token,
				"Content-Type": "application/json",
			})
			.send({name:"group1",maillocal:"group1",description:"desc"})
			.expect(400, done);
	});
	it("should create a new group", (done) => {
		request(app)
			.post("/api/groups")
			.set({
				Authorization: "Token "+token,
				"Content-Type": "application/json",
			})
			.send(group)
			.expect((res) => {
				res.body.should.have.property("id");
				groupId = res.body.id;
			})
			.expect(201, done);
	});
	it("should get the only group", (done) => {
		request(app)
			.get("/api/groups")
			.set({
				Authorization: "Token "+token,
			})
			.expect((res) => {
				groups = res.body;
				res.body.should.be.an.array;
				res.body.should.not.be.empty;
				res.body.should.have.length(1);
			})
			.expect(200, done);
	});
	it("should get created group posts", (done) => {
		request(app)
			.get(`/api/groups/${groups[0].id}/posts`)
			.set({
				Authorization: "Token "+token,
			})
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.be.empty;
			})
			.expect(200, done);
	});
})

// vim: noai:ts=4:sw=4
