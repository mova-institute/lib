'use strict';

const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const del = require('del');
const dirname = require('path').dirname;

const PROJECR_ROOT = process.cwd();
const dist = 'lib';
const tsProjectFile = 'src/tsconfig.json';

function swallowError (error) {
  console.log(error.toString());
  this.emit('end');
}

function nop() {}


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
gulp.task('typescript', [], () => {
	let tsProject = ts.createProject(tsProjectFile, {
		//typesctipt: require('typescript')
	});

	let tsResult = tsProject.src()
		//.pipe(sourcemaps.init({ debug: true }))
		.pipe(ts(tsProject));
	
	tsResult.dts.pipe(gulp.dest('lib'));
	
	return tsResult.js
		.pipe(babel(/*{presets: ['es2015']}*/).on('error', swallowError))
		// .pipe(sourcemaps.write('.', {
		// 	includeContent: false,
		// 	sourceRoot: PROJECR_ROOT + '/src'
		// }))
		.pipe(gulp.dest('lib'));
});



////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
gulp.task('cleanup:dist', () => {
	return del(['../mi-lib-dist/**/*'], { force: true });
});
////////////////////////////////////////////////////////////////////////////////
gulp.task('typescript:dist', ['cleanup:dist'], () => {
	let tsProject = ts.createProject(tsProjectFile, {
		//typesctipt: require('typescript')
	});

	return tsProject.src()
		.pipe(ts(tsProject))
		.js
		.pipe(babel({presets: ['es2015']}))
		.pipe(uglify())
		.pipe(gulp.dest('../mi-lib-dist/lib'));
});

gulp.task('copy:dist', ['cleanup:dist'], () => {
	return gulp.src(['bin/**', 'data/dict/**', 'package.json'], { base: '.' })
		.pipe(gulp.dest('../mi-lib-dist/'));
});




gulp.task('build:dist', ['typescript:dist', 'copy:dist']);
gulp.task('build', ['typescript']);

gulp.task('develop', ['build'], () => {
	gulp.watch(['src/**/*.ts', tsProjectFile], ['typescript']);
});

gulp.task('default', ['develop']);