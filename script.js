var catbox = angular.module('catbox', ['ngRoute']);

catbox.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
        when('/', {
            templateUrl: 'template.html',
            controller: 'BeatsCtrl'
        }).
        when('/:bpm/:sequence0/:sequence1/:sequence2/:sequence3', {
            templateUrl: 'template.html',
            controller: 'BeatsCtrl'
        }).
        otherwise({
            redirectTo: '/'
        });
}]);

catbox.run(['$route', '$rootScope', '$location', function ($route, $rootScope, $location) {
    var original = $location.path;
    $location.path = function (path, reload) {
        if (reload === false) {
            var lastRoute = $route.current;
            var un = $rootScope.$on('$locationChangeSuccess', function () {
                $route.current = lastRoute;
                un();
            });
        }
        return original.apply($location, [path]);
    };
}])

catbox.controller('BeatsCtrl', function ($scope, $routeParams, $location) {
    // initialize audio context and general data
    var context = new (window.AudioContext || window.webkitAudioContext)();
    var analyser = context.createAnalyser();
    $scope.bpm = $routeParams.bpm ? parseInt($routeParams.bpm, 10) : 120;
    $scope.bpl = 16; // beats per line
    $scope.sequence = decodeUrlSequence();
    $scope.playingSequence = false;
    $scope.currentBeat = 0;
    $scope.currentUrl = window.location.href;
    
    // get audio samples ready and initialize empty sequence
    $scope.audios = [
        { url: 'files/meow0.wav' },
        { url: 'files/meow1.wav' },
        { url: 'files/meow2.wav' },
        { url: 'files/meow3.wav' }
    ];
    angular.forEach($scope.audios, function(audio, meowIndex){
        // get sample ready
        audio.element = new Audio();
        audio.element.src = audio.url;
        audio.element.controls = true;
        audio.element.autoplay = false;
        audio.element.loop = false;
        audio.source = context.createMediaElementSource(audio.element);
        audio.source.connect(analyser);        
    });
    $scope.touched = [false, false, false, false];
    
    // connect audio to the context
    analyser.connect(context.destination);
    
    // change the value of the beat
    $scope.changeBeat = function(lineIndex, beatIndex) {
        $scope.sequence[lineIndex][beatIndex] = 1 - $scope.sequence[lineIndex][beatIndex];
        $scope.encodeUrlSequence();
    }
    
    $scope.touchMeow = function(meowIndex) {
        $scope.playMeow(meowIndex);
        $scope.touched[meowIndex] = true;
        setTimeout(function(){
            $scope.$apply(function() {
                $scope.touched[meowIndex] = false;
            });
        }, 15000 / $scope.bpm);
    }
    
    // exactly what the name says
    $scope.playMeow = function(meowIndex) {
        // $scope.audios[meowIndex].element.currentTime = 0;
        $scope.audios[meowIndex].element.load();
        $scope.audios[meowIndex].element.play();
    };
    
    $scope.playSequence = function() {
        if ($scope.playingSequence) {
            $scope.playingSequence = false;
        } else {
            $scope.playingSequence = true;
            playBeat();
        }
    };
    
    var playBeat = function() {
        angular.forEach($scope.sequence, function(line, lineIndex){
            $scope.sequence[lineIndex][$scope.currentBeat] && $scope.playMeow(lineIndex);
        });
        setTimeout(function(){
            if ($scope.playingSequence) {
                $scope.currentBeat = $scope.currentBeat < $scope.bpl - 1 ? $scope.currentBeat + 1 : 0;
                $scope.$digest();
                playBeat();
            }
        }, 30000 / $scope.bpm);
    };
    
    $scope.stopSequence = function() {
        $scope.playingSequence = false;
        $scope.currentBeat = 0;
    };
    
    function decodeUrlSequence() {
        var lines = [$routeParams.sequence0, $routeParams.sequence1, $routeParams.sequence2, $routeParams.sequence3];
        var sequence = new Array();
        angular.forEach(lines, function(line){
            if (line) {
                var decimal = parseInt(line, 16);
                var binaryString = decimal.toString(2);
                while (binaryString.length < $scope.bpl) {
                    binaryString = '0' + binaryString;
                }
                line = binaryString.split('');
                for (var i=0; i < line.length; i++) {
                    line[i] = parseInt(line[i], 10);
                }
                sequence.push(line);
            } else {
                var line = new Array();
                for (var i = 0; i < $scope.bpl; i++) {
                    line.push(0);
                }
                sequence.push(line);
            }
        });
        return sequence;
    }
    
    $scope.encodeUrlSequence = function() {
        var urlSequence = new Array();
        angular.forEach($scope.sequence, function(line) {
            line = line.join('');
            line = parseInt(line, 2);
            urlSequence.push(line.toString(16));
        });
        urlSequence = urlSequence.join('/');
        $location.path('/' + $scope.bpm + '/' + urlSequence, false);
        $scope.currentUrl = window.location.href;
    }
});