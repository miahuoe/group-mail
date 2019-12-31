const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");

const randomString = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const numUsers = 10;
let users = [];

for (i = 0; i < numUsers; i++) {
	users.push({
		login: randomString()+i,
		password: randomString()+i,
		email: randomString()+i+"@mailmail.com",
	});
}

let {login, password, email} = users[0]
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
			email: email,
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
	it("should 404 on /users", (done) => {
		request(app)
			.get(`/api/groups/${groups[0].id+69}/users`)
			.set({
				Authorization: "Token "+token,
			})
			.expect(404)
			.end(done);
	});
	it("should be the only member", (done) => {
		request(app)
			.get(`/api/groups/${groups[0].id}/users`)
			.set({
				Authorization: "Token "+token,
			})
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.not.be.empty;
				res.body.should.have.length(1);
				res.body[0].should.have.property("login");
				res.body[0].login.should.be.equal(login);
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
