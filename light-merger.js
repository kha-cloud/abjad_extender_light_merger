#!/usr/bin/env node

const chokidar = require('chokidar');
const fs = require("fs");
const path = require("path"); 
const merge = require('deepmerge')
const Helpers = require('./helpers.js');
var timerCallback = null;
var initalTimerCounter = 0;
var initiatedFilesCounter = 0;
var interval;

//---------------------- GETTING PARAMS
const Flags = {};// --log --no-watching --delete
for (const arg of process.argv) {
	if(arg.includes("--")){
		// single True params
		if(!arg.includes("=")){
			Flags[arg.replace("--", "")] = true;
		}else{
			// Non Boolean params
			Flags[arg.replace("--", "").split("=")[0]] = arg.replace("--", "").split("=")[1];
		}
		continue;
	}
	if(arg.includes("-")){
		// single True params
		if(!arg.includes("=")){
			Flags[arg.replace("-", "")] = true;
		}
		continue;
	}
}


//----------------------- HELP
if(Flags.help || Flags.h){
	console.log("Help:");
	console.log("    ");
	console.log("    Installation:");
	console.log("    npm install -g ./");
	console.log("    ");
	console.log("    Options:");
	console.log("    --log              Enable console logging");
	console.log("    --no-watching      Create the final directory and quit");
	console.log("    --delete           Delete destination folder's content before starting");
	console.log("    --merge-files      Merge similar files");
	console.log("                       JSON files   : [npm deepmerge] is used");
	console.log("                       *    files   : For yielding:");
	console.log("                                      #ABJAD_EXTENDER_YIELD=section_name#");
	console.log("                                    : For section creation:");
	console.log("                                      #ABJAD_EXTENDER_SECTION=section_name to Replace");
	console.log("                                      #ABJAD_EXTENDER_SECTION_APPEND=section_name to Append");
	console.log("                                      #ABJAD_EXTENDER_SECTION_APPEND_LN=section_name to Append with a line break");
	console.log("                                      #ABJAD_EXTENDER_SECTION_PREPEND=section_name to Prepend");
	console.log("    --help (-h)        Show Help");
	console.log("    ");
	console.log("    COMMAND: lightmgr <OPTIONS>");
	console.log("    ");
	process.exit(1);
}

//----------------------- CHECKING FOR CONFIG FILE
var rootDir = process.cwd();
// console.log(rootDir);
if (!fs.existsSync(rootDir+'/light-merger.json')) {
	console.error("'light-merger.json' is missing!");
	process.exit(1);
}
// const config = JSON.parse(fs.readFileSync(rootDir+'/light-merger.json', 'utf8').replace(/@\//g, rootDir+"/").replace(/@/g, rootDir));
const config = JSON.parse(fs.readFileSync(rootDir+'/light-merger.json', 'utf8'));

//----------------------- INSTALLATION


var watcher = null;
const Files = {};
var toWatchList = [];
var toExcludeList = [];
var toExcludeFilesList = [];
var mergesToDestinations = {};
var finalDir = (config.final || "").replace(/@\//g, rootDir + "/").replace(/@/g, rootDir);
if(finalDir.slice(-1) == "/") finalDir = finalDir.slice(0, -1);

var generateMultiLevelJSON = (path, newPath, mode) => {
	var data;
	try {
		data = JSON.parse(fs.readFileSync(Files[newPath].files[0], 'utf8'));
	} catch (error) {
		console.log("--------------------- ERROR ----------------------");
		console.log(error);
		console.log("--------------------- _____ ----------------------");
		throw "JSON ERROR in -> "+Files[newPath].files[0]
	}
	for (let i = 1; i < Files[newPath].files.length; i++) {
		try {
			data = merge(data, JSON.parse(fs.readFileSync(Files[newPath].files[i], 'utf8')));
		} catch (error) {
			console.log("--------------------- ERROR ----------------------");
			console.log(error);
			console.log("--------------------- _____ ----------------------");
			throw "JSON ERROR in -> "+Files[newPath].files[i]
		}
	}
  fs.writeFileSync(newPath, JSON.stringify(data, null, "\t"));
}

var generateMultiLevelTEXT = (path, newPath, mode) => {
	var data;
	data = fs.readFileSync(Files[newPath].files[0], 'utf8');
	for (let i = 1; i < Files[newPath].files.length; i++) {
		data = Helpers.abjadTextMerge(data, fs.readFileSync(Files[newPath].files[i], 'utf8'));
	}
  fs.writeFileSync(newPath, data);
}

var generateMultiLevelHTML = (path, newPath, mode) => {
	var data;
	data = fs.readFileSync(Files[newPath].files[0], 'utf8');
	for (let i = 1; i < Files[newPath].files.length; i++) {
		data = Helpers.abjadHTMLMerge(data, fs.readFileSync(Files[newPath].files[i], 'utf8'));
	}
  fs.writeFileSync(newPath, data);
}

var generateMultiLevelFile = (path, newPath, mode) => {
	// Could be optimized for inital start to generate only once at the end by using the (mode & path) params
  if(Files[newPath].type.toUpperCase() == "JSON" ){
		generateMultiLevelJSON(path, newPath, mode);
	}else if("VUE HTML JSX TSX".includes(Files[newPath].type.toUpperCase()) ){
		generateMultiLevelHTML(path, newPath, mode);
	}else{
		generateMultiLevelTEXT(path, newPath, mode);
	}
}

var getNewPath = (path) => {
	// Reduce is used because EXP: the file /parent/child/a.txt is in /parent/child and /parent and the longer is true
	var parentFolder = toWatchList.filter((p) => {
		return path.includes(p);
	})
	.reduce((a, b) => {
		return (a.length > b.length) ? a : b;
	});

	var newPath;
	if(mergesToDestinations[parentFolder]){
		newPath = path.replace(
			parentFolder,
			mergesToDestinations[parentFolder]
		);
	}else{
		newPath = path.replace(
			parentFolder,
			finalDir
		);
	}
	return newPath;
};

var resultHandler = (Flags["log"]) ? Helpers.resultHandler : ()=>{};

var READY_EVENT = async () => {
	await Helpers.delay(200);
	// watcherAvailable = true;
	// ('Initial scan complete. Ready for changes');
	if(Flags["no-watching"]) {
		watcher.close().then(() => console.log('All changes are done (without watching)'));
		return;
	}
	console.clear();
	console.log('________________________________________');
	console.log('');
	console.log('--------- Light Merger is ready --------');
	console.log('________________________________________');
	console.log('');
	console.log('');
	console.log('Listening for changes ...');
}

if(Flags["no-watching"]){
	timerCallback = READY_EVENT;
	READY_EVENT = ()=>{};
	interval = setInterval(function(){
		initalTimerCounter += 1;
		if(initalTimerCounter > 4 && initiatedFilesCounter == 0){
			clearInterval(interval);
			if(Flags["log"]) console.log("cleared ready timer");
			timerCallback();
		}
		//do whatever here..
	}, 500);
}

var initWatcher = () => {
	// console.log("initTMPWatcher() Started", 1);
	// toWatchList.push(rootDir);
	toWatchList = toWatchList.concat(
		config.merges
		.map(merge => {
			var newPath = path.resolve(merge.path.replace(/@\//g, rootDir + "/").replace(/@/g, rootDir));
			for (let i = 0; i < (merge.excludes || []).length; i++) {
				var excludedPath = merge.excludes[i].replace(/@\//g, newPath + "/").replace(/@/g, newPath).replace(/\.\./g, "");
				if(fs.existsSync(excludedPath) && fs.lstatSync(excludedPath).isDirectory()){
					toExcludeList.push(excludedPath);
				}else{
					toExcludeFilesList.push(excludedPath);
				}
			}
			if(merge.to){
				mergesToDestinations[newPath] = path.resolve(merge.to.replace(/@\//g, finalDir + "/").replace(/@/g, finalDir));
				if(mergesToDestinations[newPath].slice(-1) == "/") mergesToDestinations[newPath] = mergesToDestinations[newPath].slice(0, -1);
			}
			return newPath;
		})
	);
	toExcludeList = toExcludeList.concat((config.excludes || []).map(p => p.replace(/@\//g, rootDir + "/").replace(/@/g, rootDir)));
	if(Flags["log"]) console.log("++++++++++++++++++++++  To Watch List  ++++++++++++++++++++++");
	if(Flags["log"]) console.log(toWatchList);
	if(Flags["log"]) console.log("++++++++++++++++++++++ To Exclude List ++++++++++++++++++++++");
	if(Flags["log"]) console.log(toExcludeList);
	watcher = chokidar.watch(toWatchList, {
		ignored: (path, stat) => {
			//Particular cases
			// console.log("_______________________"+path);
			if (path.includes(".goutputstream")) return true;
			if (toExcludeList.includes(path)) {
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
			initalTimerCounter = 0;
			initiatedFilesCounter ++;
			if(toExcludeFilesList.includes(path)) return;
			await Helpers.delay(200);
			// count++;
			// if (count > 3) process.exit(0);
			if(Flags["merge-files"]) {
				if(!Files[getNewPath(path)]){
					Files[getNewPath(path)] = {
						type: path.split('/').pop().split('.').pop(),
						files: [
							path
						],
					};
					fs.copyFile(path, getNewPath(path), fs.constants.COPYFILE_FICLONE, resultHandler);
				}else{
					Files[getNewPath(path)].files.push(path);
					generateMultiLevelFile(path, getNewPath(path), "add");
				}
			}else{
				fs.copyFile(path, getNewPath(path), fs.constants.COPYFILE_FICLONE, resultHandler);
			}
			if(Flags["log"]) console.log(`File ${path} has been added`);
			// if (watcherAvailable) this.updater("add", path);
			initiatedFilesCounter --;
			initalTimerCounter = 0;
		})
		.on('change', async (path) => {
			if(Flags["no-watching"]) {
				return;
			}
			if(toExcludeFilesList.includes(path)) return;
			await Helpers.delay(200);
			if(Flags["merge-files"]) {
				if(Files[getNewPath(path)].files.length == 1){
					fs.copyFile(path, getNewPath(path), fs.constants.COPYFILE_FICLONE, resultHandler);
				}else{
					generateMultiLevelFile(path, getNewPath(path), "change");
				}
			}else{
				fs.copyFile(path, getNewPath(path), fs.constants.COPYFILE_FICLONE, resultHandler);
			}
			if(Flags["log"]) console.log(`File ${path} has been changed`);
			// if (watcherAvailable) this.updater("change", path);
		})
		.on('unlink', path => {
			try {
				fs.rm(getNewPath(path), resultHandler);
			} catch (error) {
				console.error(error);
			}
			if(Flags["log"]) console.log(`File ${path} has been removed`);
			// if (watcherAvailable) this.updater("unlink", path);
		})
		.on('addDir', path => {
			if (getNewPath(path) == finalDir) return;
			fs.mkdir(getNewPath(path), resultHandler);
			if(Flags["log"]) console.log(`Directory ${path} has been added`);
			// if (watcherAvailable) this.updater("addDir", path);
		})
		.on('unlinkDir', path => {
			if(Flags["log"]) console.log(`Directory ${path} has been removed`);
			fs.removeSync(getNewPath(path), { recursive: true });
			// if (watcherAvailable) this.updater("unlinkDir", path);
		})
		.on('error', (error) => {
			if(Flags["log"]) console.log(`Watcher error: ${error}`);
			// if (watcherAvailable) this.updater("error", path);
		})
		.on('ready', READY_EVENT);
	// console.log("Watcher events created");
	// console.log("initTMPWatcher() Completed");
};

// Ensuring empty folder
if (fs.existsSync(finalDir)) {
	if(Flags.delete) Helpers.deleteFolderContent(finalDir);
} else {
	fs.mkdirSync(finalDir);
}

// Start watching
initWatcher();
