'use strict';

module.exports = function(grunt) {

    // config tasks
    grunt.initConfig({
        // read package informations
        pkg : grunt.file.readJSON('package.json'),
        banner: '/*!\n' +
                ' * Tarsius UI v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
                ' * Copyright 2014-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
                ' * Licensed under <%= pkg.license %>\n' +
                ' */\n' ,
        // jshint
        jshint: {
            options: {
                "browser": true,
                "globals": {
                    "angular": true,
                    "_": true,
                    "module": true,
                    "console": true,
                },
                "globalstrict": true,
                "quotmark": false,
                "undef": true,
                "unused": false,
                "shadow": true,
                "jquery": true,
                "node": true
            },
            beforeconcat: ['Gruntfile.js', 'js/**/*.js', 'test/**/*.js'],
            afterconcat: ['dist/<%= pkg.name %>.js']
        },

        // file watcher
        watch: {
            files : ['<%= jshint.files %>'],
            task: ['jshint']
        },

        // concat all scripts
        concat: {
            options: {
                // Replace all 'use strict' statements in the code with a single one at the top
                banner: "<%= banner %>\n'use strict';\n",
                process: function(src, filepath) {
                    return '// Source: ' + filepath + '\n' + src.replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1');
                },
            },
            dist: {
                src: ['js/**/*.js'],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },

        // minified all scripts
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        }
    });

    // load tasks
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    // grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // register tasks
    // test
    grunt.registerTask('test',['jshint:beforeconcat','concat:dist','jshint:afterconcat']);
    // deploy
    grunt.registerTask('dist',['jshint:beforeconcat','concat:dist','jshint:afterconcat','uglify:dist']);
    // default
    grunt.registerTask('default',['dist']);
};