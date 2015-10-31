'use strict';

let gulp = require('gulp');
let ts = require('gulp-typescript');
let sourcemaps = require('gulp-sourcemaps');
let babel = require('gulp-babel');

let dirname = require('path').dirname;
const PROJECR_ROOT = process.cwd();
const dist = 'lib';

let tsProjectFile = 'src/tsconfig.json';
let babelOptions = {
	whitelist: [
		'strict',
		'es6.destructuring',
		'es6.modules',
		'es6.parameters',
	]
};

gulp.task('typescript', () => {
	let tsProject = ts.createProject(tsProjectFile, {
		//typescript: require('typescript')	// for local nightly build
	});

	let tsResult = tsProject.src()
		.pipe(sourcemaps.init({ debug: true }))
		.pipe(ts(tsProject));

	tsResult.js
		.pipe(babel(babelOptions))
		.on('error', (e) => { console.log('eeeeeeeeeeeeeee', e); })
		.pipe(sourcemaps.write('.', {
			includeContent: false,
			sourceRoot: PROJECR_ROOT + '/src'
		}))
		.pipe(gulp.dest(dist));
	tsResult.dts.pipe(gulp.dest(dist));

});

gulp.task('debug', () => {
	let tsResult = gulp.src('dbg/**/*.ts')
		//.pipe(sourcemaps.init())
		.pipe(ts());
	tsResult.js
		//.pipe(babel(babelOpts))
		//.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dbg'));
});


gulp.task('develop', ['typescript'], () => {
	gulp.watch(['src/**/*.ts', tsProjectFile], ['typescript']);
});

gulp.task('default', ['develop']);