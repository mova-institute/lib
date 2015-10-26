'use strict';

let gulp = require('gulp');
let ts = require('gulp-typescript');
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
	
	let tsResult = tsProject.src().pipe(ts(tsProject));
	
	tsResult.js
		.pipe(babel(babelOpts))
		//.on('error', (e) => {console.log(e);})
		.pipe(gulp.dest(dist));
	tsResult.dts.pipe(gulp.dest(dist));
});


gulp.task('develop', ['typescript'], () => {
	gulp.watch(['src/**/*.ts', tsProjectFile], ['typescript']);
});

gulp.task('default', ['develop']);