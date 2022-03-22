const fs = require("fs-extra");

var resultHandler = function(err) { 
	if(err) {
		 console.log("unlink failed", err);
	}
}

var deleteFolderContent = (folder) => {
	var content = fs.readdirSync(folder);
	for (const f of content) {
    fs.removeSync(folder+"/"+f);
		// if (fs.lstatSync(folder+"/"+f).isDirectory()) {
		// 	// console.log("DIR " + f);
		// 	fs.removeSync(folder+"/"+f, { recursive: true });
		// } else {
		// 	// console.log(f);
		// 	fs.unlinkSync(folder+"/"+f);
		// }
	}
};

var delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var abjadTextMerge = (strA, strB) => {
  // var yields = (strA.match(/(#ABJAD_EXTENDER_YIELD=.*#)/g) || []).map( key => key.slice(0, -1).replace("#ABJAD_EXTENDER_YIELD=", ""));
  if(!strA.match(/(#ABJAD_EXTENDER_YIELD=.*#)/g)){
    return strB;
  }
  var finalData = strA;
  var lines = strB.split('\n');
  var nextSectionKey = null;
  var nextOperation = "";
  var nextData = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if((line.slice(0, "#ABJAD_EXTENDER_SECTION".length) == "#ABJAD_EXTENDER_SECTION") || i == lines.length-1){
      if(i == lines.length-1){
        if(nextSectionKey){
          nextData.push(line);
        }
      }
      if(nextSectionKey){
        var res = nextData.join("\n");
        if(nextOperation == "_APPEND") res = "#ABJAD_EXTENDER_YIELD="+nextSectionKey+"#" + res;
        if(nextOperation == "_APPEND_LN") res = "#ABJAD_EXTENDER_YIELD="+nextSectionKey+"#\n" + res;
        if(nextOperation == "_PREPEND") res = res + "#ABJAD_EXTENDER_YIELD="+nextSectionKey+"#";
        finalData = finalData.replace(new RegExp("#ABJAD_EXTENDER_YIELD="+nextSectionKey+"#", 'g'), res);
        nextSectionKey = null;
        nextOperation = "";
        nextData = [];
      }
      var tmp = line.replace("#ABJAD_EXTENDER_SECTION", "").split("=");
      nextOperation = tmp[0].toUpperCase();
      nextSectionKey = tmp[1];
    }else{
      if(nextSectionKey){
        nextData.push(line);
      }
    }
  }
  return finalData;
}

var abjadHTMLMerge = (strA, strB) => {
  // var yields = (strA.match(/(#ABJAD_EXTENDER_YIELD=.*#)/g) || []).map( key => key.slice(0, -1).replace("#ABJAD_EXTENDER_YIELD=", ""));
  if(!strA.match(/(ABJAD_EXTENDER_YIELD)/g)){
    return strB;
  }
  var finalData = strA;
  var lines = strB.split('\n');
  var nextSectionKey = null;
  var nextOperation = "";
  var nextData = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if((line.slice(0, "#ABJAD_EXTENDER_SECTION".length) == "#ABJAD_EXTENDER_SECTION") || i == lines.length-1){
      if(i == lines.length-1){
        if(nextSectionKey){
          nextData.push(line);
        }
      }
      if(nextSectionKey){
        var res = nextData.join("\n");
        // HTML
        if(nextOperation == "_APPEND") res = "<!--ABJAD_EXTENDER_YIELD="+nextSectionKey+"-->" + res;
        else if(nextOperation == "_APPEND_LN") res = "<!--ABJAD_EXTENDER_YIELD="+nextSectionKey+"-->\n" + res;
        else if(nextOperation == "_PREPEND") res = res + "<!--ABJAD_EXTENDER_YIELD="+nextSectionKey+"-->";
        finalData = finalData.replace(new RegExp("<!--ABJAD_EXTENDER_YIELD="+nextSectionKey+"-->", 'g'), res);
        // JS
        if(nextOperation == "_APPEND") res = "\/.ABJAD_EXTENDER_YIELD="+nextSectionKey+".\/" + res;
        else if(nextOperation == "_APPEND_LN") res = "\/.ABJAD_EXTENDER_YIELD="+nextSectionKey+".\/\n" + res;
        else if(nextOperation == "_PREPEND") res = res + "\/.ABJAD_EXTENDER_YIELD="+nextSectionKey+".\/";
        finalData = finalData.replace(new RegExp("\/.ABJAD_EXTENDER_YIELD="+nextSectionKey+".\/", 'g'), res);
        nextSectionKey = null;
        nextOperation = "";
        nextData = [];
      }
      var tmp = line.replace("#ABJAD_EXTENDER_SECTION", "").split("=");
      nextOperation = tmp[0].toUpperCase();
      nextSectionKey = tmp[1] || "_APPEND";
    }else{
      if(nextSectionKey){
        nextData.push(line);
      }
    }
  }
  return finalData;
}

module.exports = {
  delay,
  deleteFolderContent,
  resultHandler,
  abjadTextMerge,
  abjadHTMLMerge,
};