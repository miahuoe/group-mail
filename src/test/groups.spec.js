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

let tokens = new Array(numUsers);
let group = {
	name: randomString(),
	maillocal: randomString(),
	description: randomString()
};
let userId = 0;
let groupId = 0;
let groups = [];

describe("/groups", () => {
	before(() => {

	});
	it("POST /api/users/register should create an user", (done) => {
		request(app)
			.post("/api/users/register")
			.send(users[0])
			.expect(201, done);
	});
	it("POST /api/users/login should login", (done) => {
		request(app)
			.post("/api/users/login")
			.auth(users[0].login, users[0].password)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect((res) => {
				tokens[0] = res.body.token;
			})
			.expect(200, done);
	});
	it("GET  /api/groups should get an empty list of groups", (done) => {
		request(app)
			.get("/api/groups")
			.set({
				Authorization: "Token "+tokens[0],
			})
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.be.empty;
				groups = res.body;
			})
			.expect(200, done);
	});
	it("POST /api/groups should reject too short name", (done) => {
		request(app)
			.post("/api/groups")
			.set({
				Authorization: "Token "+tokens[0],
				"Content-Type": "application/json",
			})
			.send({name:"group1",maillocal:"group1",description:"desc"})
			.expect(400, done);
	});
	it("POST /api/groups should create a new group", (done) => {
		request(app)
			.post("/api/groups")
			.set({
				Authorization: "Token "+tokens[0],
				"Content-Type": "application/json",
			})
			.send(group)
			.expect((res) => {
				res.body.should.have.property("id");
				groupId = res.body.id;
			})
			.expect(201, done);
	});
	it("GET  /api/groups should get the only group", (done) => {
		request(app)
			.get("/api/groups")
			.set({
				Authorization: "Token "+tokens[0],
			})
			.expect((res) => {
				groups = res.body;
				res.body.should.be.an.array;
				res.body.should.not.be.empty;
				res.body.should.have.length(1);
			})
			.expect(200, done);
	});
	it("GET  /api/groups/:id/users should 404 on non-existent group", (done) => {
		request(app)
			.get(`/api/groups/${groups[0].id+69}/users`)
			.set({
				Authorization: "Token "+tokens[0],
			})
			.expect(404)
			.end(done);
	});
	it("GET  /api/groups/:id/users should return one member", (done) => {
		request(app)
			.get(`/api/groups/${groups[0].id}/users`)
			.set({
				Authorization: "Token "+tokens[0],
			})
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.not.be.empty;
				res.body.should.have.length(1);
				res.body[0].should.have.property("login");
				res.body[0].login.should.be.equal(users[0].login);
				res.body[0].should.have.property("id");
				userId = res.body[0].id;
			})
			.expect(200, done);
	});
	it("GET  /api/groups/:id/posts should get created group posts", (done) => {
		request(app)
			.get(`/api/groups/${groups[0].id}/posts`)
			.set({
				Authorization: "Token "+tokens[0],
			})
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.be.empty;
			})
			.expect(200, done);
	});
	it("POST /api/groups/:id/users should 404 on inexisting user", (done) => {
		request(app)
			.post(`/api/groups/${groups[0].id}/users`)
			.set({
				Authorization: "Token "+tokens[0],
			})
			.query({
				email: "hohoho@hohomail.com",
			})
			.expect(404)
			.end(done);
	});
	it("POST /api/groups/:id/users should 400 on member user", (done) => {
		request(app)
			.post(`/api/groups/${groups[0].id}/users`)
			.set({
				Authorization: "Token "+tokens[0],
			})
			.query({
				email: users[0].email,
			})
			.expect(400)
			.end(done);
	});
	it("POST /api/groups/:id/leave should 400 on group admin", (done) => {
		request(app)
			.post(`/api/groups/${groups[0].id}/users`)
			.set({
				Authorization: "Token "+tokens[0],
			})
			.expect(400)
			.end(done);
	});
	it("DELETE /api/groups/:id/users/:login should 400 on group admin", (done) => {
		request(app)
			.delete(`/api/groups/${groups[0].id}/users/${userId}`)
			.set({
				Authorization: "Token "+tokens[0],
			})
			.expect(400)
			.end(done);
	});
	// TODO leave on member
	// TODO DELETE on member
})

// vim: noai:ts=4:sw=4
