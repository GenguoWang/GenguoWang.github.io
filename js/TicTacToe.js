(function (window) {
    "use strict";
    var ChessTypeBlack = 0;
    var ChessTypeWhite = 1;
    var ChessTypeEmpty = 2;
    var Chess = KingoJS.Class.define
    (
        function(width, height, type)
        {
            if(type === undefined) type = ChessTypeEmpty;
            this.type = type;
            this.width = width;
            this.height = height;
        },
        {
            draw:function(ctx)
            {
                if(this.type == ChessTypeEmpty) return;
                ctx.save();
                this.setDrawStyle(ctx);
                ctx.beginPath();
                ctx.rect(0,0,this.width,this.height);
                ctx.fill();
                ctx.restore();
            },
            setDrawStyle:function(ctx)
            {
                if(this.type == ChessTypeBlack)
                {
                    ctx.fillStyle = "#040404";
                }
                else if(this.type == ChessTypeWhite)
                {
                    ctx.fillStyle = "#dcdcdc";
                }
            }
        }
    );
    var Board = KingoJS.Class.define
    (
        function(width, height, rows, cols, borderSize)
        {
            if(borderSize === undefined) borderSize = 2;
            this.width = width;
            this.height = height;
            this.rows = rows;
            this.cols = cols;
            this.total = this.cols * this.rows;
            this.borderSize = borderSize;
            this.listener = [];
            this.chesses = [];
            var chessWidth = (this.width-this.borderSize*(this.cols+1))/this.cols;
            var chessHeight = (this.height-this.borderSize*(this.rows+1))/this.rows;
            for(var i=0;i<this.total;++i)
            {
                this.chesses[i] = new Chess(chessWidth, chessHeight);
                var row = Math.floor(i / this.cols);
                var col = i % this.cols;
                this.chesses[i].offsetX = col * (chessWidth+this.borderSize)+this.borderSize;
                this.chesses[i].offsetY = row * (chessHeight+this.borderSize)+this.borderSize;
            }
        },
        {
            draw:function(ctx)
            {
                if(!ctx) ctx = this.ctx;
                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = "#ffffff";
                ctx.rect(0,0,this.width,this.height);
                ctx.fill();
                ctx.beginPath();
                ctx.lineWidth = this.borderSize;
                var chessWidth = (this.width-this.borderSize*(this.cols+1))/this.cols;
                var chessHeight = (this.height-this.borderSize*(this.rows+1))/this.rows;
                var halfBorder = this.borderSize/2;
                var borderSize = this.borderSize;
                for(var i=0; i<=this.rows;++i)
                {
                    ctx.moveTo(0,i*(chessHeight+borderSize)+halfBorder);
                    ctx.lineTo(this.width,i*(chessHeight+borderSize)+halfBorder);
                }
                for(var i=0; i<=this.cols;++i)
                {
                    ctx.moveTo(i*(chessWidth+borderSize)+halfBorder,0);
                    ctx.lineTo(i*(chessWidth+borderSize)+halfBorder,this.height);
                }
                ctx.stroke();
                for(var i=0;i<this.total;++i)
                {
                    var chess = this.chesses[i];
                    ctx.translate(chess.offsetX, chess.offsetY);
                    chess.draw(ctx);
                    ctx.translate(-chess.offsetX, -chess.offsetY);
                }
                ctx.restore();
            },
            addListener:function(handle)
            {
                if(handle)this.listener.push(handle);
            },
			reset:function()
			{
				this.listener = [];
                for(var i=0; i<this.total;++i)
                {
                    this.chesses[i].type = ChessTypeEmpty;
                }
			},
            onClick:function(x, y)
            {
                for(var i=0;i<this.total;++i)
                {
                    var chess = this.chesses[i];
                    if(x>=chess.offsetX && x<chess.offsetX+chess.width
                        && y>=chess.offsetY && y < chess.offsetY+chess.height)
                    {
                        for(var j=0;j<this.listener.length;++j)
                        {
                            this.listener[j](i,this.chesses[i].type);
                        }
                    }
                }
            },
            setChess:function(chessId, type)
            {
                this.chesses[chessId].type = type;
            }
        }
    );
    var PlayRoleBlack = 0;
    var PlayRoleWhite = 1;
    var PlayRoleNone = 2;
    var PlayTimer = 0;
    var PlayAuto = KingoJS.Class.define(
        function()
        {
            this.role = PlayRoleNone;
        },
        {
            nextPlay:function(board)
            {
                var chesses = board.chesses;
                var allAvail = [];
                for(var i = 0; i < 9;++i)
                {
                    if(chesses[i].type == ChessTypeEmpty) allAvail.push(i);
                }
                var i = Math.random()*allAvail.length;
                i = Math.floor(i);
                return KingoJS.Promise.timeout(PlayTimer).then(function(){return allAvail[i];});
            }
        }
    );
    var PlayAi = KingoJS.Class.define(
        function()
        {
            this.role = PlayRoleNone;
            //v = w0+w1*x1+w2*x2+w3*x3
            this.w = [0,0,0,0];
            this.wNum = 4;
            this.stepSize = 0.01;
        },
        {
            learn:function(chessHistory, winner)
            {
                //Black start first
                if(this.role == PlayRoleNone) return;
                var value;
                if(winner == PlayRoleBlack)
                {
                    value = 100;
                }
                else if(winner == PlayRoleWhite)
                {
                    value = -100;
                }
                else value = 0;
                //Black: chessLabel[0]
                //White: chessLabel[1]
                //1 for this.role, 2 for opponent
                var chessLabel;
                var stepChoose;
                if(this.role == PlayRoleBlack)
                {
                    chessLabel = [1,2];
                    stepChoose = 0;
                }
                else if(this.role == PlayRoleWhite)
                {
                    value = -value;
                    chessLabel = [2,1];
                    stepChoose = 1;
                }
                var chesses = [0,0,0,0,0,0,0,0,0];
                console.log("learn");
                for(var i=0; i < chessHistory.length; ++i)
                {
                    chesses[chessHistory[i]] = chessLabel[i%2];
                }
                for(var i=chessHistory.length-1; i>=0;--i)
                {
                    if(i%2 == stepChoose)
                    {
                        var x = this.getX(chesses);
                        var estimateValue = 0;
                        for(var j=0; j<this.wNum;++j) estimateValue += x[j]*this.w[j];
                        for(var j=0; j<this.wNum;++j)
                        {
                            this.w[j] += (value-estimateValue)*x[j]*this.stepSize;
                        }
                        value = estimateValue;
                    }
                    chesses[chessHistory[i]] = 0;
                }
            },
            getEstimateValue:function(chesses)
            {
                var x = this.getX(chesses);
                var estimateValue = 0;
                for(var j=0; j<this.wNum;++j) estimateValue += x[j]*this.w[j];
                return estimateValue;
            },
            getX:function(chesses)
            {
                var x = [1,0,0,0];
                function handleOneline(line)
                {
                    var y = [1,0,0,0];
                    line.sort();
                    var lineValue = line.reduce(function(sum,num){return sum*3+num});
                    var treeValue = 13;
                    var twoValue = 4;
                    var otherTwo = 8;
                    if(lineValue == treeValue) x[1]++;
                    else if(lineValue == twoValue) x[2]++;
                    else if(lineValue == otherTwo) x[3]++;
                }
                handleOneline([chesses[0],chesses[1],chesses[2]]);
                handleOneline([chesses[3],chesses[4],chesses[5]]);
                handleOneline([chesses[6],chesses[7],chesses[8]]);
                handleOneline([chesses[0],chesses[3],chesses[6]]);
                handleOneline([chesses[1],chesses[4],chesses[7]]);
                handleOneline([chesses[2],chesses[5],chesses[8]]);
                handleOneline([chesses[0],chesses[4],chesses[8]]);
                handleOneline([chesses[2],chesses[4],chesses[6]]);
                if(x[1]>0) x[1] = 1;
                return x;
            },
            nextPlay:function(board)
            {
                var chesses = board.chesses;
                var allAvail = [];
                var convertedChesses=[];
                var chessLabel = [1,2];
                if(this.role == PlayRoleWhite) chessLabel = [2,1];
                for(var i = 0; i < 9;++i)
                {
                    if(chesses[i].type == ChessTypeEmpty)
                    {
                        allAvail.push(i);   
                        convertedChesses[i] = 0;
                    }
                    else if(chesses[i].type == ChessTypeWhite)
                    {
                        convertedChesses[i] = chessLabel[1];
                    }
                    else
                    {
                        convertedChesses[i] = chessLabel[0];
                    }
                }
                var chessId;
                var maxValue = -100000;
                for(var i = 0; i < allAvail.length;++i)
                {
                    convertedChesses[allAvail[i]] = 1;
                    var tmpValue = this.getEstimateValue(convertedChesses);
                    if(tmpValue > maxValue)
                    {
                        chessId = allAvail[i];
                        maxValue = tmpValue;
                    }
                    convertedChesses[allAvail[i]] = 0;
                }
                console.log("max "+maxValue);
                return KingoJS.Promise.timeout(PlayTimer).then(function(){return chessId;});
            },
            afterGame:function(game)
            {
                this.learn(game.chessHistory, game.winner);
            }
        }
    );
    var PlayHuman = KingoJS.Class.define(
        function()
        {
            this.role = PlayRoleNone;
            this.state = "idle";
            this.p = undefined;
        },
        {
            onChessClick:function(chessId, chessType)
            {
                if(this.state=="wait")
                {
                    if(chessType == ChessTypeEmpty)
                    {
                        this.state == "idle";
                        this.p.resolve(chessId);
                    }
                }
            },
            nextPlay:function(board)
            {
                this.p = new KingoJS.Promise();
                this.state = "wait";
                return this.p;
            },
            beforeGame:function(game)
            {
                game.board.addListener(this.onChessClick.bind(this));
            }
        }
    );
    var Game = KingoJS.Class.define(
        function(player1,player2,board)
        {
            this.players = [player1,player2];
            player1.role = PlayRoleBlack;
            player2.role = PlayRoleWhite;
            this.board = board;
            this.curPlay = 1;
            this.curChessType = ChessTypeWhite;
            this.chessHistory = [];
            //this.playHandler = this.handlePlay.bind(this);
        },
        {
            handlePlay:function(chessId)
            {
                //console.log("played "+chessId + " "+this.curChessType);
                this.chessHistory.push(chessId);
                this.board.setChess(chessId, this.curChessType);
                this.board.draw();
                if(this.isFinished())
                {
                    this.players[0].afterGame && this.players[0].afterGame(this);
                    this.players[1].afterGame && this.players[1].afterGame(this);
                    this.p.resolve(this);
                }
                else
                {
                    this.nextStep();
                }
            },
            nextStep:function()
            {
                this.curPlay = (this.curPlay+1)%this.players.length;
                if(this.curChessType == ChessTypeBlack)
                    this.curChessType = ChessTypeWhite;
                else
                    this.curChessType = ChessTypeBlack;
                //console.log("play "+this.curPlay);
                //may create a new function every time. could use this.playHandler instead
                this.players[this.curPlay].nextPlay(this.board).then( this.handlePlay.bind(this));
            },
            play:function()
            {
                this.board.reset();
                this.board.draw();
                this.players[0].beforeGame && this.players[0].beforeGame(this);
                this.players[1].beforeGame && this.players[1].beforeGame(this);
                this.p = new KingoJS.Promise();
                this.nextStep();
                return this.p;
            },
            isFinished:function()
            {
                var chesses = this.board.chesses;
                var total = this.board.total;
                this.winner = -1;
                for(var i=0;i<3;++i)
                {
                    if(chesses[i].type ==chesses[i+3].type && 
                       chesses[i].type ==chesses[i+6].type &&
                       chesses[i].type != ChessTypeEmpty)
                    {
                        this.winner = chesses[i].type;
                        return true;
                    }
                    if(chesses[i*3].type ==chesses[i*3+1].type && 
                       chesses[i*3].type ==chesses[i*3+2].type &&
                       chesses[i*3].type != ChessTypeEmpty)
                    {
                        this.winner = chesses[i*3].type;
                        return true;
                    }
                }
                if(chesses[0].type ==chesses[4].type && 
                   chesses[0].type ==chesses[8].type &&
                   chesses[0].type != ChessTypeEmpty)
                {
                    this.winner = chesses[0].type;
                    return true;
                }
                if(chesses[2].type ==chesses[4].type && 
                   chesses[2].type ==chesses[6].type &&
                   chesses[2].type != ChessTypeEmpty)
                {
                    this.winner = chesses[2].type;
                    return true;
                }
                var allFilled = true;
                for(var i=0;i<total;++i)
                {
                    if(chesses[i].type == ChessTypeEmpty) allFilled=false;
                }
                return allFilled;
            }
        }
    );
    var board = new Board(400,400,3,3,3);
    var total=100;
    var cnt=0;
    var status = [0, 0, 0];
    var allGamesPlayedPromise;
    var aiPlayer = [new PlayAi(), new PlayAi()];
    var autoPlayer = [new PlayAuto(), new PlayAuto()];
    var humanPlayer = [new PlayHuman(), new PlayHuman()];
    function getPlayer(select, name)
    {
        if(name == "Random")
        {
            return autoPlayer[select];
        }
        else if(name == "Human")
        {
            return humanPlayer[select];
        }
        else if(name == "AI")
        {
            return aiPlayer[select];
        }
    }
    function getMsg(winner)
    {
        var msg;
        if(winner == PlayRoleBlack)
        {
            msg="Black Win!";   
        }
        else if(winner == PlayRoleWhite)
        {
            msg = "White Win!";
        }
        else
        {
            msg = "Tie!";
        }
        return msg;
    }
    function runGames(player0, player1)
    {
        function oneGameRun(game)
        {
            var winner = game.winner;
            if(winner == PlayRoleBlack)
            {
                status[0]++;
            }
            else if(winner == PlayRoleWhite)
            {
                status[1]++;
            }
            else
            {
                status[2]++;
            }
            cnt++;
            console.log(cnt + " games run");
            if(cnt < total)
            {
                new Game(game.players[0],game.players[1],board).play().then(oneGameRun);   
            }
            else allGamesPlayedPromise.resolve();
        }

        allGamesPlayedPromise = new KingoJS.Promise();
        var game = new Game(player0, player1, board);
        game.play().then(oneGameRun);
        return allGamesPlayedPromise;
    }
    function setParamAndGetPlayers()
    {
        var delay = document.getElementById("selDelay").value;
        PlayTimer = parseInt(delay);
        total = parseInt(document.getElementById("txtTotal").value);
        var name0 = document.getElementById("selLeft").value;
        var name1 = document.getElementById("selRight").value;
        var player0 = getPlayer(0, name0);
        var player1 = getPlayer(1, name1);
        return [player0, player1];
    }
    function inRunning()
    {
        var btnPlay = document.getElementById("btnPlay");
        var btnRun = document.getElementById("btnRun");
        btnPlay.disabled = true;
        btnRun.disabled = true;
    }
    function afterRunning()
    {
        var btnPlay = document.getElementById("btnPlay");
        var btnRun = document.getElementById("btnRun");
        btnPlay.disabled = false;
        btnRun.disabled = false;
    }
    function btnPlayClicked()
    {
        inRunning();
        var players = setParamAndGetPlayers();
        var game = new Game(players[0],players[1],board);
        game.play().then(function(game)
        {
            var msg = getMsg(game.winner);
            alert(msg);
            afterRunning();
        });
    }
    function btnRunClicked()
    {
        inRunning();
        var players = setParamAndGetPlayers();
        cnt = 0;
        status = [0,0,0];
        runGames(players[0], players[1]).then(function(){
            alert(status[0]+" "+status[1]+" "+status[2]);
            afterRunning();
        });
    }
    window.document.addEventListener("DOMContentLoaded", function () {
        var c = document.getElementById("myCanvas");
        var ctx = c.getContext("2d");
        board.draw(ctx);
        board.ctx = ctx;
        var cLeft = c.offsetLeft;
        var cTop = c.offsetTop;
        c.addEventListener("click",function(event) {
            var x = event.pageX - cLeft;
            var y = event.pageY - cTop;
            if(x >=0 && x < board.width && y>=0 && y < board.height)
            {
                board.onClick(x,y);
            }
        },false);
        var btnPlay = document.getElementById("btnPlay");
        btnPlay.addEventListener("click", btnPlayClicked,false);
        var btnRun = document.getElementById("btnRun");
        btnRun.addEventListener("click", btnRunClicked,false);
        //afterRunning();
    }, false);
})(window);
