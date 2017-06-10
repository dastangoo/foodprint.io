module.exports = function(grunt){
  grunt.config.merge({
    sass: {
      options: {
        sourceMap: true,
        outputSytle: 'compressed'
      },
      compile: {
        files: [{
          dest: '<%= pkg.cfg.baseDir %>css/foodprint.css',
          src: '<%= pkg.cfg.baseDir %>scss/foodprint.scss'
        }]
      }
    },
    watch: {
        sass: {
          files: ['<%= pkg.cfg.baseDir %>js/src/**/*.js'],
          tasks: ['bundle'],
          options: {
              livereload: true
          }
        }
      }
    });
  grunt.config('watch', watch);
};
