(function (window) {
    "use strict";
    var ChessTypeBlack = 0;
    var ChessTypeWhite = 1;
    var ChessTypeEmpty = 2;
    var Chess = KingoJS.Class.define
    (
        function(width, height, type = ChessTypeEmpty)
        {
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
        function(width, height, rows, cols, borderSize = 2)
        {
            this.width = width;
            this.height = height;
            this.rows = rows;
            this.cols = cols;
            this.total = this.cols * this.rows;
            this.borderSize = borderSize;
            this.chesses = [];
            this.listener = [];
            var chessWidth = (this.width-this.borderSize*(this.cols+1))/this.cols;
            var chessHeight = (this.height-this.borderSize*(this.rows+1))/this.rows;
            for(var i=0;i<this.total;++i)
            {
                this.chesses[i] = new Chess(chessWidth, chessHeight);
                var row = Math.trunc(i / this.cols);
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
                            this.listener[j](i);
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
    var PlayAuto = KingoJS.Class.define(
        function(role)
        {
            this.role = role;
        },
        {
            nextPlay:function(board)
            {
                var chesses = board.chesses;
                while(true)
                {
                    var i = Math.random()*9;
                    i = Math.trunc(i);
                    if(chesses[i].type == ChessTypeEmpty)
                    {
                        console.log("auto " + i);
                        return KingoJS.Promise.as(i);
                    }
                }
            }
        }
    );
    var PlayHuman = KingoJS.Class.define(
        function(role)
        {
            this.role = role;
            this.state = "idle";
            this.p = undefined;
            this.tmpBoard = undefined;
        },
        {
            onChessClick:function(chessId)
            {
                if(this.state=="wait")
                {
                    if(this.tmpBoard.chesses[chessId].type == ChessTypeEmpty)
                    {
                        this.state == "idle";
                        this.p.resolve(chessId);
                    }
                }
            },
            nextPlay:function(board)
            {
                this.tmpBoard = board;
                this.p = new KingoJS.Promise();
                this.state = "wait";
                return this.p;
            }
        }
    );
    var Game = KingoJS.Class.define(
        function(player1,player2,board)
        {
            if(player1.role == PlayRoleBlack)
                this.players = [player1,player2];
            else 
                this.players = [player2,player1];
            this.board = board;
            this.curPlay = 0;
            this.curChessType = ChessTypeBlack;
        },
        {
            play:function()
            {
                console.log("play "+this.curPlay);
                this.players[this.curPlay].nextPlay(this.board).then(function(chessId)
                {
                    console.log("played "+chessId + this.curChessType);
                    this.board.setChess(chessId, this.curChessType);
                    this.board.draw();
                    if(this.isFinished())
                    {
                        var msg;
                        if(this.winner == ChessTypeBlack) msg="Black Win!";
                        else if(this.winner == ChessTypeWhite) msg = "White Win!";
                        else msg = "Tie!";
                        alert(msg);
                        return;
                    }
                    this.curPlay = (this.curPlay+1)%this.players.length;
                    if(this.curChessType == ChessTypeBlack)
                        this.curChessType = ChessTypeWhite;
                    else
                        this.curChessType = ChessTypeBlack;
                    this.play();
                }.bind(this));
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
    window.document.addEventListener("DOMContentLoaded", function () {
        var board = new Board(400,400,3,3,3);
        var c = document.getElementById("myCanvas");
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#ff0000";
        ctx.strokeStyle = "#00ff00";
        board.draw(ctx);
        board.ctx = ctx;
        var cLeft = c.offsetLeft;
        var cTop = c.offsetTop;
        console.log("off"+cLeft+" "+cTop);
        c.addEventListener("click",function(event) {
            var x = event.pageX - cLeft;
            var y = event.pageY - cTop;
            if(x >=0 && x < board.width && y>=0 && y < board.height)
            {
                board.onClick(x,y);
            }
        },false);
        var autoPlayer = new PlayAuto(PlayRoleBlack);
        var humanPlayer = new PlayHuman(PlayRoleWhite);
        board.addListener(humanPlayer.onChessClick.bind(humanPlayer));
        var game = new Game(humanPlayer, autoPlayer, board);
        game.play();
    }, false);
})(window);
