const { Server } = require('socket.io');
const sockets = require("./sockets");

module.exports = (server) => {
	const io = new Server(server, {
		cors: {
			origin: function (origin, callback) {
				const allowedOrigins = [process.env.FRONTEND_URL];
				if (allowedOrigins.includes(origin) || !origin) {
					callback(null, true);
				} else {
					callback(new Error("Not allowed by CORS"));
				}
			},
			allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
			methods: ["GET", "POST", "PUT", "DELETE"],
		},
	});

	io.on("connection", async (socket) => {
		// console.log("Online", { socketId: socket.id })
		await socket.on("disconnect", () => {
			// console.log("Offline", { socketId: socket.id})
		});
		await sockets(io, socket);
	});

	return io;
};
