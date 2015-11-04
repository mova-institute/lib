'use strict';

let gulp = require('gulp');
let ts = require('gulp-typescript');
let sourcemaps = require('gulp-sourcemaps');
let traceur = require('gulp-traceur');
let dirname = require('path').dirname;

const PROJECR_ROOT = process.cwd();
const dist = 'lib';
let tsProjectFile = 'src/tsconfig.json';


gulp.task('traceur:runtime', function() {
  return gulp.src(traceur.RUNTIME_PATH)
    .pipe(gulp.dest(dist));
});


gulp.task('typescript', ['traceur:runtime'], () => {
	let tsProject = ts.createProject(tsProjectFile);

	let tsResult = tsProject.src()
		.pipe(sourcemaps.init({ debug: true }))
		.pipe(ts(tsProject));
	
	tsResult.dts.pipe(gulp.dest(dist));
	
	return tsResult.js
		.pipe(traceur())
		.on('error', (e) => { console.log('eeeeeeeeeeeeeee', e); })
		.pipe(sourcemaps.write('.', {
			includeContent: false,
			sourceRoot: PROJECR_ROOT + '/src'
		}))
		.pipe(gulp.dest(dist));
});


gulp.task('develop', ['typescript'], () => {
	gulp.watch(['src/**/*.ts', tsProjectFile], ['typescript']);
});

gulp.task('default', ['develop']);