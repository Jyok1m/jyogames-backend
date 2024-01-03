const sockets = (io, socket) => {
  socket.on("online", (data, callback) => {
    socket.data.token = data.token;
    // console.log("Online", { socketId: socket.id, token: socket.data.token })
    callback("User is online");
  });

  socket.on("offline", (callback) => {
    socket.data.token = null;
    callback("User is offline");
  });

  /* Game logic */

  socket.on("newGame", (data, callback) => {
    const { gameId, tokens } = data;
    console.log("newGame", { gameId, tokens });

    socket.emit("fetchNewGame", { gameId, tokens });
    callback({ success: true });
  });

  socket.on("initResumeGame", (data) => {
    const { gameId, tokens } = data;
    console.log("initResumeGame", { gameId, tokens });

    socket.emit("saveListModalOpen", { gameId, tokens });
  });

  socket.on("resumeGame", (data, callback) => {
    const { gameId, tokens } = data;
    console.log("resumeGame", { gameId, tokens });

    socket.emit("fetchResumedGame", { gameId, tokens });
    callback({ success: true });
  });
};

module.exports = sockets;
