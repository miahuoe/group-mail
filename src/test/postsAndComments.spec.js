const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");

const randomString = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const login = randomString();
const password = randomString();
const email = randomString();
let token = "";
const group = {
	name: randomString(),
	maillocal: randomString(),
	description: randomString()
};
let groupId = 0;

describe("posts & comments", () => {
	it("GET  /api/groups/:id:/posts should 401 when not authorized", (done) => {
		request(app)
			.get(`/api/groups/1/posts`)
			.expect(401, done);
	});
	it("POST /api/groups/:id:/posts should 401 when not authorized", (done) => {
		request(app)
			.post(`/api/groups/1/posts`)
			.expect(401, done);
	});
	it("GET  /api/groups/:id/posts/:id/comments should 401 when not authorized", (done) => {
		request(app)
			.get(`/api/groups/1/posts/1/comments`)
			.expect(401, done);
	});
	it("POST /api/groups/:id/posts/:id/comments should 401 when not authorized", (done) => {
		request(app)
			.post(`/api/groups/1/posts/1/comments`)
			.expect(401, done);
	});
	it("POST /api/users/register should create an user", (done) => {
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
	// TODO existing but not joined to
	it("should 404 for inexistent group when getting", (done) => {
		request(app)
			.get(`/api/groups/${groupId+2}/posts`)
			.set({
				Authorization: "Token "+token,
			})
			.expect(404, done);
	});
	it("should 401 when not authorized", (done) => {
		request(app)
			.post(`/api/groups/${groupId+2}/posts`)
			.expect(401, done);
	});
	it("should 404 for inexistent group when posting", (done) => {
		const post = {
			body: "hello",
		};
		request(app)
			.post(`/api/groups/${groupId+2}/posts`)
			.set({
				Authorization: "Token "+token,
			})
			.send(post)
			.expect(404, done);
	});
	it("GET  /api/groups/:id/posts should get created group posts", (done) => {
		request(app)
			.get(`/api/groups/${groupId}/posts`)
			.set({
				Authorization: "Token "+token,
			})
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.be.empty;
			})
			.expect(200, done);
	});
	it(`POST /api/groups/:id/posts should 400 post without body`, (done) => {
		const p = {
		};
		request(app)
			.post(`/api/groups/${groupId}/posts`)
			.set({
				Authorization: "Token "+token,
			})
			.send(p)
			.expect(400)
			.end(done);
	});
	let posts = [];
	for (i = 0; i < 2; i++) {
		it(`POST /api/groups/:id/posts should post a valid post`, (done) => {
			const p = {
				body: `post body ${i}`,
			};
			request(app)
				.post(`/api/groups/${groupId}/posts`)
				.set({
					Authorization: "Token "+token,
				})
				.send(p)
				.expect((res) => {
					res.body.should.have.property("id");
					res.body.should.have.property("body");
					posts.push(parseInt(res.body.id));
				})
				.expect(201, done);
		});
	}
	it("GET  /api/groups/:id/posts/:id/comments should 404 for inexistent post when getting", (done) => {
		request(app)
			.get(`/api/groups/${groupId}/posts/${posts[1]+2}/comments`)
			.set({
				Authorization: "Token "+token,
			})
			.expect(404)
			.end(done);
	});
	it("POST /api/groups/:id/posts/:id/comments should 400 for invalid comment", (done) => {
		const c = {
		};
		request(app)
			.post(`/api/groups/${groupId}/posts/${posts[1]}/comments`)
			.set({
				Authorization: "Token "+token,
			})
			.send(c)
			.expect(400, done);
	});
	it("POST /api/groups/:id/posts/:id/comments should 404 for inexistent post", (done) => {
		const c = {
			body: "hello",
		};
		request(app)
			.post(`/api/groups/${groupId}/posts/${posts[1]+2}/comments`)
			.set({
				Authorization: "Token "+token,
			})
			.send(c)
			.expect(404)
			.end(done);
	});
	it(`should get posts`, (done) => {
		request(app)
			.get(`/api/groups/${groupId}/posts`)
			.set({
				Authorization: "Token "+token,
			})
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.not.be.empty;
				res.body[0].should.have.property("id");
				res.body[0].should.have.property("body");
				res.body[0].should.have.property("author");

				//TODO test ordering, limit and offset
				//res.body[0].id.should.be.equal(posts[0]);
				//res.body[1].id.should.be.equal(posts[1]);
			})
			.expect(200, done);
	});
	let comments = [];
	for (i = 0; i < 2; i++) {
		it("should add a comment", (done) => {
			const c = {
				body: "comment body",
			};
			request(app)
				.post(`/api/groups/${groupId}/posts/${posts[0]}/comments`)
				.set({
					Authorization: "Token "+token,
				})
				.send(c)
				.expect((res) => {
					res.body.should.have.property("id");
					res.body.should.have.property("body");
					res.body.should.have.property("authorId");
					comments.push(parseInt(res.body.id));
				})
				.expect(201, done);
		});
	}
	it("should get comments", (done) => {
		request(app)
			.get(`/api/groups/${groupId}/posts/${posts[0]}/comments`)
			.query({
				limit: 5,
				offset: 0
			})
			.set({
				Authorization: "Token "+token,
			})
			.expect((res) => {
				res.body.should.be.an.array;
				res.body[0].should.have.property("id");
				//TODO test ordering, limit and offset
				//res.body[0].id.should.be.equal(comments[0]);
				//res.body[1].id.should.be.equal(comments[1]);
			})
			.expect(200, done);
	});
})

// vim: noai:ts=4:sw=4
