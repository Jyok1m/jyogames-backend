const cloudinary = require("cloudinary").v2;

async function getCloudFolderContent(folderName) {
	cloudinary.config({
		cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
		api_key: process.env.CLOUDINARY_API_KEY,
		api_secret: process.env.CLOUDINARY_API_SECRET,
	});

	try {
		let nextCursor = null;
		let allAssets = [];

		do {
			const response = await cloudinary.search.expression(`folder:${folderName}`).max_results(100).next_cursor(nextCursor).execute();

			allAssets = allAssets.concat(response.resources);
			nextCursor = response.next_cursor;
		} while (nextCursor);

		return allAssets;
	} catch (error) {
		console.error("Error fetching assets:", error);
		throw error;
	}
}

module.exports = { getCloudFolderContent };