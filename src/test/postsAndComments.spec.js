const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");

const randomString = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

describe("posts & comments", () => {
	let users = [];
	let groups = [];
	before(async (done) => {
		for (let i = 0; i < 6; i++) {
			let user = {
				login: randomString()+i,
				password: randomString()+i,
				email: randomString()+i+"@testmail.com",
			};
			await request(app)
				.post("/api/users/register")
				.send(user)
				.expect(201);
			await request(app)
				.post("/api/users/login")
				.auth(user.login, user.password)
				.expect((res) => {
					res.body.should.have.property("token");
					user.token = res.body.token;
				})
				.expect(200);
			users.push(user);
		}
		for (let i = 0; i < 3; i++) {
			let group = {
				name: randomString()+i,
				maillocal: randomString()+i,
				description: "desc lol",
			};
			await request(app)
				.post("/api/groups")
				.set({ Authorization: "Token "+users[i].token })
				.send(group)
				.expect((res) => {
					res.body.should.have.property("id");
					group.id = res.body.id;
				})
				.expect(201);
			groups.push(group);
		}
		done();
	});
	describe("/api/groups/:id/posts", () => {
		it("GET should 401 when not authorized", (done) => {
			request(app)
				.get(`/api/groups/1/posts`)
				.expect(401, done);
		});
		it("POST should 401 when not authorized", (done) => {
			request(app)
				.post(`/api/groups/1/posts`)
				.expect(401, done);
		});
		it("POST should 404 for inexistent group", (done) => {
			request(app)
				.get(`/api/groups/${groups[1].id+10}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.expect(404)
				.end(done);
		});
		it("POST should 404 for inexistent group when posting", (done) => {
			const post = {
				body: "hello",
			};
			request(app)
				.post(`/api/groups/${groups[1].id+10}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.send(post)
				.expect(404)
				.end(done);
		});
		it("GET should get empty array", (done) => {
			request(app)
				.get(`/api/groups/${groups[0].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.be.empty;
				})
				.expect(200)
				.end(done);
		});
		it(`POST should 400 post without body`, (done) => {
			const p = {};
			request(app)
				.post(`/api/groups/${groups[0].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.send(p)
				.expect(400)
				.end(done);
		});
		it(`POST should post a valid post`, (done) => {
			const p = { body: "post body" };
			request(app)
				.post(`/api/groups/${groups[0].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.send(p)
				.expect((res) => {
					res.body.should.have.property("id");
					res.body.should.have.property("body");
				})
				.expect(201)
				.end(done);
		});
	});
	describe("/api/groups/:id/posts/:id/comments", () => {
		it("GET should 401 when not authorized", (done) => {
			request(app)
				.get(`/api/groups/1/posts/1/comments`)
				.expect(401, done);
		});
		it("POST should 401 when not authorized", (done) => {
			request(app)
				.post(`/api/groups/1/posts/1/comments`)
				.expect(401, done);
		});
	});
	describe("commenting and posting", () => {
		it("should 404 for inexistent post", (done) => {
			request(app)
				.get(`/api/groups/${groups[0].id}/posts/999999999/comments`)
				.set({ Authorization: "Token "+users[0].token })
				.expect(404)
				.end(done);
		});
		it("should post 2 valid posts and retrieve them", async (done) => {
			let posts = [];
			for (i = 0; i < 2; i++) {
				const p = { body: `post body ${i}` };
				await request(app)
					.post(`/api/groups/${groups[1].id}/posts`)
					.set({ Authorization: "Token "+users[1].token })
					.send(p)
					.expect(201)
					.expect((res) => {
						res.body.should.have.property("id");
						res.body.should.have.property("body");
						posts.push(parseInt(res.body.id));
					});
			}
			await request(app)
				.get(`/api/groups/${groups[1].id}/posts`)
				.set({ Authorization: "Token "+users[1].token })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(2);
					res.body[0].should.have.property("id");
					res.body[0].should.have.property("body");
					res.body[0].should.have.property("author");
					res.body[0].id.should.be.equal(posts[1]);
					res.body[1].id.should.be.equal(posts[0]);
				});
			done();
		});
		it("should 401 when getting posts from existing group, as non-member", (done) => {
			request(app)
				.get(`/api/groups/${groups[2].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.expect(401)
				.end(done);
		});
		it("should post 2 valid comments and retrieve them", async (done) => {
			let comments = [];
			let postid = 0;
			const p = { body: `post body ${i}` };
			await request(app)
				.post(`/api/groups/${groups[2].id}/posts`)
				.set({ Authorization: "Token "+users[2].token })
				.send(p)
				.expect(201)
				.expect((res) => {
					res.body.should.have.property("id");
					res.body.should.have.property("body");
					postid = parseInt(res.body.id);
				});
			for (i = 0; i < 2; i++) {
				await request(app)
					.post(`/api/groups/${groups[2].id}/posts/${postid}/comments`)
					.set({ Authorization: "Token "+users[2].token })
					.send({ body: `comment ${i}` })
					.expect(201)
					.expect((res) => {
						res.body.should.have.property("id");
						res.body.should.have.property("body");
						comments.push(parseInt(res.body.id));
					});
			}
			request(app)
				.get(`/api/groups/${groups[2].id}/posts/${postid}/comments`)
				.set({ Authorization: "Token "+users[2].token })
				.query({ limit: 5, offset: 0 })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.not.be.empty;
					res.body.should.have.length(2);
					res.body[0].should.have.property("id");
					res.body[0].should.have.property("body");
					res.body[0].should.have.property("authorId"); // TODO
					res.body[0].id.should.be.equal(comments[1]);
					res.body[1].id.should.be.equal(comments[0]);
				}).end(done);
		});
	});
	// TODO limit and offset
});

// vim: noai:ts=4:sw=4
