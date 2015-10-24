'use strict';

let gulp = require('gulp');
let ts = require('gulp-typescript');
let babel = require('gulp-babel');


let dist = 'dist';

let tsProjectFile = 'src/tsconfig.json';
gulp.task('typescript', () => {
	let tsProject = ts.createProject(tsProjectFile, {
		typescript: require('typescript')	// for local nightly build
	});
	
	let tsResult = tsProject.src().pipe(ts(tsProject));
	
	tsResult.js.pipe(babel()).pipe(gulp.dest(dist));
	tsResult.dts.pipe(gulp.dest(dist));
});


gulp.task('develop', ['typescript'], () => {
	gulp.watch(['src/**/*.ts', tsProjectFile], ['typescript']);
});

gulp.task('default', ['develop']);