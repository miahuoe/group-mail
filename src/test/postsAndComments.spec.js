const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");

const randomString = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const createUsers = async (N = 10) => {
	let users = [];
	for (let i = 0; i < N; i++) {
		let user = {
			login: randomString()+i,
			password: randomString(),
			email: randomString()+i+"@lolmail.com",
		};
		await request(app)
			.post("/api/users/register")
			.send(user)
			.expect(201);
		await request(app)
			.post("/api/users/login")
			.auth(user.login, user.password)
			.expect(200)
			.expect((res) => {
				res.body.should.have.property("token");
				user.token = res.body.token;
			});
		users.push(user);
	}
	return users;
};

const createGroup = async (token) => {
	let group = {
		name: randomString(),
		maillocal: randomString(),
		description: randomString(),
	};
	await request(app)
		.post("/api/groups")
		.set({ Authorization: "Token "+token })
		.send(group)
		.expect(201)
		.expect((res) => {
			res.body.should.have.property("id");
			group.id = res.body.id;
		});
	return group;
};

describe("posts & comments", () => {
	let users = [];
	let groups = [];
	before(async (done) => {
		users = await createUsers(6);
		for (let i = 0; i < 3; i++) {
			groups.push(await createGroup(users[i].token));
		}
		done();
	});
	describe("GET /api/groups/:id/posts - empty", () => {
		it("should 400 on invalid groupId", (done) => {
			request(app)
				.get(`/api/groups/invalid/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.expect(400)
				.end(done);
		});
		it("should 404 on non-existent group", (done) => {
			request(app)
				.get(`/api/groups/99999/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.expect(404)
				.end(done);
		});
		it("should 401 when not authorized", (done) => {
			request(app)
				.get(`/api/groups/1/posts`)
				.expect(401, done);
		});
		it("should 400 too small limit", (done) => {
			request(app)
				.get(`/api/groups/${groups[0].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.query({ limit: 1, offset: 0 })
				.expect(400)
				.end(done);
		});
		it("should 400 too big limit", (done) => {
			request(app)
				.get(`/api/groups/${groups[0].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.query({ limit: 999999999999999 })
				.expect(400)
				.end(done);
		});
		it("should 400 too big offset", (done) => {
			request(app)
				.get(`/api/groups/${groups[0].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.query({ offset: 999999999999999 })
				.expect(400)
				.end(done);
		});
		it("should get empty array", (done) => {
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
	});
	describe("GET /api/groups/:id/posts - not empty", () => {
		let users = [];
		let groups = [];
		let posts = [];
		const numPosts = 25;
		before(async (done) => {
			users = await createUsers(1);
			groups = [await createGroup(users[0].token)];
			for (let i = 0; i < numPosts; i++) {
				let p = { body: `post #${i}` };
				await request(app)
					.post(`/api/groups/${groups[0].id}/posts`)
					.set({ Authorization: "Token "+users[0].token })
					.send(p)
					.expect((res) => {
						res.body.should.have.property("id");
						res.body.should.have.property("body");
						res.body.body.should.be.equal(p.body);
						posts.push(res.body);
					})
					.expect(201);
			}
			done();
		});
		it(`should get array of ${numPosts} posts`, (done) => {
			request(app)
				.get(`/api/groups/${groups[0].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.query({ limit: 50, offset: 0 })
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(numPosts)
				})
				.expect(200)
				.end(done);
		});
		const limit = 15;
		it(`should get array of ${limit} most recent posts as posts are sorted by date and then by id`, (done) => {
			request(app)
				.get(`/api/groups/${groups[0].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.query({ limit: limit, offset: 0 })
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(limit)
					for (let i = 0; i < limit; i++) {
						const p = res.body[i];
						p.should.have.property("id");
						p.id.should.be.equal(posts[numPosts-1 - i].id);
						p.should.have.property("body");
					}
				})
				.expect(200)
				.end(done);
		});
		it("should get array of 10 recent posts with offset 10", (done) => {
			request(app)
				.get(`/api/groups/${groups[0].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.query({ limit: 10, offset: 10 })
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(10)
					for (let i = 0; i < 10; i++) {
						const p = res.body[i];
						p.should.have.property("id");
						p.id.should.be.equal(posts[numPosts-1 - 10 - i].id);
						p.should.have.property("body");
					}
				})
				.expect(200)
				.end(done);
		});
	});
	describe("POST /api/groups/:id/posts", () => {
		let posts = [];
		const numPosts = 5;
		before(async (done) => {
			for (let i = 0; i < numPosts; i++) {
				const p = { body: `post body ${i}` };
				await request(app)
					.post(`/api/groups/${groups[2].id}/posts`)
					.set({ Authorization: "Token "+users[2].token })
					.send(p)
					.expect(201)
					.expect((res) => {
						res.body.should.have.property("id");
						res.body.should.have.property("body");
						posts.push(res.body);
					});
			}
			done();
		});
		it("should 401 when not authorized", (done) => {
			request(app)
				.post(`/api/groups/1/posts`)
				.expect(401, done);
		});
		it("should 404 for inexistent group", (done) => {
			request(app)
				.get(`/api/groups/${groups[1].id+10}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.expect(404)
				.end(done);
		});
		it("should 404 for inexistent group when posting", (done) => {
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
		it(`should 400 post without body`, (done) => {
			const p = {};
			request(app)
				.post(`/api/groups/${groups[0].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.send(p)
				.expect(400)
				.end(done);
		});
		it(`should post a valid post`, (done) => {
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
		it(`should retrieve ${numPosts} posts`, async (done) => {
			request(app)
				.get(`/api/groups/${groups[2].id}/posts`)
				.set({ Authorization: "Token "+users[2].token })
				.query({ limit: 50, offset: 0 })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.not.be.empty;
					res.body.should.have.length(numPosts);
					res.body[0].should.have.property("id");
					res.body[0].should.have.property("body");
					for (let i = 0; i < numPosts; i++) {
						res.body[i].id.should.be.equal(posts[posts.length-1-i].id);
					}
				})
				.end(done);
		});
	});

	describe("GET /api/groups/:id/posts/:id/comments", () => {
		it("should 401 when not authorized", (done) => {
			request(app)
				.get(`/api/groups/1/posts/1/comments`)
				.expect(401, done);
		});
		it("should 404 for inexistent post", (done) => {
			request(app)
				.get(`/api/groups/${groups[0].id}/posts/999999999/comments`)
				.set({ Authorization: "Token "+users[0].token })
				.expect(404)
				.end(done);
		});
	});

	describe("POST /api/groups/:id/posts/:id/comments", () => {
		let comments = [];
		let postid = 0;
		const numComments = 5;
		before(async (done) => {
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
			for (i = 0; i < numComments; i++) {
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
			done();
		});
		it("should 401 when not authorized", (done) => {
			request(app)
				.post(`/api/groups/1/posts/1/comments`)
				.expect(401, done);
		});
		it("should 401 when getting posts from existing group, as non-member", (done) => {
			request(app)
				.get(`/api/groups/${groups[2].id}/posts`)
				.set({ Authorization: "Token "+users[0].token })
				.expect(401)
				.end(done);
		});
		it(`should retrieve ${numComments} comments`, async (done) => {
			request(app)
				.get(`/api/groups/${groups[2].id}/posts/${postid}/comments`)
				.set({ Authorization: "Token "+users[2].token })
				.query({ limit: 50, offset: 0 })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.not.be.empty;
					res.body.should.have.length(numComments);
					res.body[0].should.have.property("id");
					res.body[0].should.have.property("body");
					res.body[0].should.have.property("authorId"); // TODO
					for (let i = 0; i < numComments; i++) {
						res.body[i].id.should.be.equal(comments[comments.length-1-i]);
					}
				})
				.end(done);
		});
	});
});

// vim: noai:ts=4:sw=4
