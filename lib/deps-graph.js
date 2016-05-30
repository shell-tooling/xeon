import * as path from 'path';
import * as fs from 'fs';
import * as urlRegex from 'url-regex';
import * as trim from 'trim';
import Graph from './graph';
import utils from './utils';
import file from './file';

// check if string is relative path
function relativePath(file) {
  return utils.beginsWith(file, './') || utils.beginsWith(file, '../');
}

// read deps file and get data
function readDepsFile(moduleLoc) {
  var pkg = path.join(moduleLoc, 'package.json');
  if (!fs.statSync(pkg).isFile()) throw new Error('can not find package.json file');
  return JSON.parse(fileUtils.readFile(pkg));
}

// get main file from package json
function getMainFile(pkgFile) {
  if (!pkgFile) throw new Error('deps file should be defined');
  return pkgFile.main || 'index.sh';
}

// find module location
function makeModuleLookup(moduleName) {
  // just for now
  return path.join(process.cwd(), 'node_modules', moduleName);
}

// return resolved string for file path
function resolveFilePath(file, parent) {
  if (!file || typeof file !== 'string') throw new Error('file should be a string');

  if (relativePath(file) && parent) {
    return path.resolve(path.dirname(parent), file);
  }

  if (relativePath(file) && !parent) {
    return path.resolve(process.cwd(), file);
  }

  if (path.isAbsolute(file)) return file;

  var modulePath = makeModuleLookup(file);
  if (!modulePath) throw new Error('Can not find modules location');

  var pkgFile = readDepsFile(modulePath);
  var mainFile = getMainFile(pkgFile);

  return path.resolve(modulePath, mainFile);
}

export default (file) => {
  let graph = new Graph();

  (function walk(file, parent) {
    // if graph already have such node skip
    if (graph.getNode(file)) return;

    let normalizedPath = resolveFilePath(file, parent);
    let data = fileUtils.readFile(normalizedPath);

    // add node if nece
    graph.addNode(normalizedPath, {
      content: trim(data.replace(_headerRegExp, ''))
    });

    // get required modules
    let required = fileUtils.parseHeader(data);

    // if parent exist add edge from it to child
    if (parent) graph.addEdge(parent, normalizedPath);
    // if no modules required break recusion
    if (!required.length) return;

    required.forEach( (path) => {
      walk(path, normalizedPath);
    });

  })(file);

  return graph;
}