#!/usr/bin/env node

const chokidar = require('chokidar');
const fs = require("fs");

//Checking for config file
var rootDir = process.cwd();
// console.log(rootDir);
if (!fs.existsSync(rootDir+'/light-merger.json')) {
	console.error("'light-merger.json' is missing!");
	process.exit(1);
}
const config = JSON.parse(fs.readFileSync(rootDir+'/light-merger.json', 'utf8').replace(/@\//g, rootDir+"/").replace(/@/g, rootDir));

var watcher = null;
var toWatchList = [];
var finalDir = config.final.replace(/@\//g, rootDir + "/").replace(/@/g, rootDir);

var deleteFolderContent = (folder) => {
	var content = fs.readdirSync(folder);
	for (const f of content) {
		if (fs.lstatSync(folder+"/"+f).isDirectory()) {
			// console.log("DIR " + f);
			fs.rmSync(folder+"/"+f, { recursive: true });
		} else {
			// console.log(f);
			fs.unlinkSync(folder+"/"+f);
		}
	}
};

var resultHandler = function(err) { 
	if(err) {
		 console.log("unlink failed", err);
	}
}

var delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var getNewPath = (path) => {
	return path.replace(toWatchList.filter(p => path.includes(p)).reduce((a, b) => (a.length > b.length) ? a : b), finalDir);
};

var initWatcher = () => {
	// console.log("initTMPWatcher() Started", 1);
	// toWatchList.push(rootDir);
	toWatchList = toWatchList.concat(config.merges.map(m => m.path.replace(/@\//g, rootDir + "/").replace(/@/g, rootDir)));
	watcher = chokidar.watch(toWatchList, {
		ignored: (path, stat) => {
			//Particular cases
			if (path.includes(".goutputstream")) return true;
			if ((config.excludes || []).map(p => p.replace(/@\//g, rootDir + "/").replace(/@/g, rootDir)).includes(path)) {
				// console.log("_________________ "+path);
				return true;
			}
			// console.log("+++++++++++++++++ "+path);
			return false;
		},
		// ignored: /(^|[\/\\])\../, // ignore dotfiles
		// persistent: !this.buildOnly
	});
	// console.log("Watcher initiated");
	// var count = 0;
	watcher
		.on('add', async (path) => {
			await delay(200);
			// count++;
			// if (count > 3) process.exit(0);
			fs.copyFile(path, getNewPath(path), fs.constants.COPYFILE_FICLONE, resultHandler);
			console.log(`File ${path} has been added`);
			// if (watcherAvailable) this.updater("add", path);
		})
		.on('change', async (path) => {
			await delay(200);
			fs.copyFile(path, getNewPath(path), fs.constants.COPYFILE_FICLONE, resultHandler);
			console.log(`File ${path} has been changed`);
			// if (watcherAvailable) this.updater("change", path);
		})
		.on('unlink', path => {
			try {
				fs.rm(getNewPath(path), resultHandler);
			} catch (error) {
				console.error(error);
			}
			console.log(`File ${path} has been removed`);
			// if (watcherAvailable) this.updater("unlink", path);
		})
		.on('addDir', path => {
			if (getNewPath(path) == finalDir) return;
			fs.mkdir(getNewPath(path), resultHandler);
			console.log(`Directory ${path} has been added`);
			// if (watcherAvailable) this.updater("addDir", path);
		})
		.on('unlinkDir', path => {
			console.log(`Directory ${path} has been removed`);
			fs.rmSync(getNewPath(path), { recursive: true });
			// if (watcherAvailable) this.updater("unlinkDir", path);
		})
		.on('error', error => {
			console.log(`Watcher error: ${error}`);
			// if (watcherAvailable) this.updater("error", path);
		})
		.on('ready', () => {
			// watcherAvailable = true;
			// ('Initial scan complete. Ready for changes');
			console.clear();
			console.log('________________________________________');
			console.log('');
			console.log('--------- Light Merger is ready --------');
			console.log('________________________________________');
			console.log('');
			console.log('');
			console.log('Listening for changes ...');
		});
	// console.log("Watcher events created");
	// console.log("initTMPWatcher() Completed");
};

// Ensuring empty folder
if (fs.existsSync(finalDir)) {
	// deleteFolderContent(finalDir);
} else {
	fs.mkdirSync(finalDir);
}

// Start watching
initWatcher();
