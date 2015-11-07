'use strict';

let gulp = require('gulp');
//let gutil = require('gulp-util');
let ts = require('gulp-typescript');
let sourcemaps = require('gulp-sourcemaps');
let traceur = require('gulp-traceur');
let babel = require('gulp-babel');
let dirname = require('path').dirname;

const PROJECR_ROOT = process.cwd();
const dist = 'lib';
let tsProjectFile = 'src/tsconfig.json';

function swallowError (error) {
  console.log(error.toString());
  this.emit('end');
}

function nop() {
	
}

let traceurOptions = {
	
};

gulp.task('typescript', [], () => {
	let tsProject = ts.createProject(tsProjectFile, {
		typesctipt: require('typescript')
	});

	let tsResult = tsProject.src()
		//.pipe(sourcemaps.init({ debug: true }))
		.pipe(ts(tsProject));
	
	tsResult.dts.pipe(gulp.dest(dist));
	
	return tsResult.js
		//.pipe(traceur(traceurOptions)/*.on('error', swallowError)*/)
		.pipe(babel().on('error', swallowError))
		// .pipe(sourcemaps.write('.', {
		// 	includeContent: false,
		// 	sourceRoot: PROJECR_ROOT + '/src'
		// }))
		.pipe(gulp.dest(dist));
});


gulp.task('develop', ['typescript'], () => {
	gulp.watch(['src/**/*.ts', tsProjectFile], ['typescript']);
});

gulp.task('default', ['develop']);