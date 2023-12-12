const socketIo = require("socket.io");
const sockets = require("./sockets");

module.exports = (server) => {
	const io = socketIo(server, {
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

	io.on("connection", (socket) => {
		socket.on("disconnect", () => {
			null;
		});
		sockets(io, socket);
	});

	return io;
};
