const sockets = async (io, socket) => {
	socket.on("connectUser", (data, callback) => {
		socket.uid = data.uid;
		callback("User connected");
	});
};

module.exports = sockets;
