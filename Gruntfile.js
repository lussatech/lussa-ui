'use strict';

module.exports = function(grunt) {

    // config tasks
    grunt.initConfig({
        // read package informations
        pkg : grunt.file.readJSON('package.json'),
        banner: '/*!\n' +
                ' * <%= pkg.name %> v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
                ' * Copyright 2014-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
                ' * Licensed under <%= pkg.license %>\n' +
                ' */\n' ,
        // jshint
        jshint: {
            options: {
                jshintrc: 'js/.jshintrc'
            },
            beforeconcat: ['Gruntfile.js', 'js/**/*.js', 'test/**/*.js'],
            afterconcat: ['dist/js/<%= pkg.name %>.js']
        },

        // concat all scripts
        concat: {
            options: {
                // Replace all 'use strict' statements in the code with a single one at the top
                banner: "<%= banner %>\n'use strict';\n",
                process: function(src, filepath) {
                    return '// Source: ' + filepath + '\n' + src.replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1');
                }
            },
            dist: {
                src: ['js/**/*.js'],
                dest: 'dist/js/<%= pkg.name %>.js'
            }
        },

        // minified all scripts
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            dist: {
                files: {
                    'dist/js/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        },

        // compile less
        less: {
            dist: {
                options: {
                    sourceMap: true,
                    outputSourceFiles: true,
                    sourceMapURL: '<%= pkg.name %>.css.map',
                    sourceMapFilename: 'dist/css/<%= pkg.name %>.css.map'
                },
                src: 'less/main.less',
                dest: 'dist/css/<%= pkg.name %>.css'
            }
        },

        // linting css
        csslint: {
            options: {
                csslintrc: 'less/.csslintrc'
            },
            dist: [
                'dist/css/<%= pkg.name %>.css'
            ]
        },

        // minified css
        cssmin: {
            options: {
                compatibility: 'ie8',
                keepSpecialComments: '*',
                advanced: false
            },
            dist: {
                src: 'dist/css/<%= pkg.name %>.css',
                dest: 'dist/css/<%= pkg.name %>.min.css'
            }
        },

        copy: {
            fonts: {
                expand: true,
                src: 'fonts/*',
                dest: 'dist/'
            },
            docs: {
                expand: true,
                cwd: 'dist/',
                src: [
                    '**/*'
                ],
                dest: 'docs/dist/'
            }
        },

        jekyll: {
            options: {
                src: 'docs',
                dest: 'docs/_site',
                config: '_config.yml'
            },
            docsDev: {
                options: {
                    serve: true,
                    watch: true,
                    port: 4190
                }
            },
            docs: {}
        },

        // file watcher
        watch: {
            docs: {
                files : [
                    'less/**/*.less',
                    'js/**/*.js'
                ],
                tasks: ['dist','copy:docs']
            },
            js: {
                files : ['js/**/*.js'],
                tasks: ['js-dist','copy:docs']
            },
            css: {
                files : ['less/**/*.less'],
                tasks: ['css-dist','copy:docs']
            }
        },

        // bower installer for docs
        bower: {
            docs: {
                options: {
                    targetDir: './docs/lib',
                    layout: 'byType',
                    install: true,
                    verbose: true,
                    cleanTargetDir: false,
                    cleanBowerDir: false
                }
            }
        },

        // concurrent process
        concurrent: {
            docs: {
                tasks: [
                    'docs-deploy',
                    'watch:js',
                    'watch:css'
                ],
                options: {
                    logConcurrentOutput: true
                }
            }
        }
    });

    // load tasks
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-csslint');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-jekyll');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-bower-task');

    // register tasks

    // JS test
    grunt.registerTask('js-test', [
        'jshint:beforeconcat',
        'concat:dist',
        'jshint:afterconcat'
    ]);
    // JS Deploy
    grunt.registerTask('js-dist', [
        'jshint:beforeconcat',
        'concat:dist',
        'jshint:afterconcat',
        'uglify:dist'
    ]);

    // CSS test
    grunt.registerTask('css-test', [
        'less:dist',
        'copy:fonts',
        'csslint:dist'
    ]);
    // CSS deploy
    grunt.registerTask('css-dist', [
        'less:dist',
        'copy:fonts',
        'csslint:dist',
        'cssmin:dist'
    ]);

    // Overall Test
    grunt.registerTask('test',['js-test','css-test']);

    // Overall Dist
    grunt.registerTask('dist',['js-dist','css-dist']);
    grunt.registerTask('build',['dist']);

    // Docs
    grunt.registerTask('docs-deploy',['dist','copy:docs','bower:docs','jekyll:docsDev']);
    grunt.registerTask('docs-dev',['concurrent:docs']);
    grunt.registerTask('serve',['concurrent:docs']);
    grunt.registerTask('docs',['dist','copy:docs','bower:docs','jekyll:docs']);

    // default
    grunt.registerTask('default',['dist']);
};
