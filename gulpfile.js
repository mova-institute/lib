'use strict';

let gulp = require('gulp');
let ts = require('gulp-typescript');
let sourcemaps = require('gulp-sourcemaps');
let babel = require('gulp-babel');


let dist = 'lib';

let tsProjectFile = 'src/tsconfig.json';
let babelOpts = {
	stage: 1
};
gulp.task('typescript', () => {
	let tsProject = ts.createProject(tsProjectFile, {
		//typescript: require('typescript')	// for local nightly build
	});
	
	let tsResult = tsProject.src()
		//.pipe(sourcemaps.init())
		.pipe(ts(tsProject));
	
	tsResult.js
		.pipe(babel(babelOpts))
		.on('error', (e) => {console.log('eeeeeeeeeeeeeee', e);})
		//.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(dist));
	tsResult.dts.pipe(gulp.dest(dist));
});

gulp.task('debug', () => {
	let tsResult = gulp.src('dbg/**/*.ts')
		.pipe(sourcemaps.init())
		.pipe(ts());
	tsResult.js
		//.pipe(babel(babelOpts))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dbg'));
});


gulp.task('develop', ['typescript'], () => {
	gulp.watch(['src/**/*.ts', tsProjectFile], ['typescript']);
});

gulp.task('default', ['develop']);