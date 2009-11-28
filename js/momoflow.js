/*!
 * momoflow javascript coverflow
 * http://flow.momolog.info
 *
 * Copyright (c) 2009 Alexander Presber
 * Dual licensed under the MIT and GPL licenses.
 *
 * Date: 2009-11-27
 */


CF = function(container, imgs, options){
  var myCF        = this;
  var grid        = 5;
  var items       = [];
  var maxAngle    = 50;
  var loadedImgs  = 0;
  var position    = 0;

  function scaleTo(obj, maxSize) {
    var w   = obj.width;
    var h   = obj.height;
    var fac = (w > h) ? maxSize / w : maxSize / h;
    return {width: w * fac, height: h * fac}
  }

  myCF.center   = container.width()/2;
  $(window).bind('resize', function(){ 
    myCF.center = container.width()/2;
    myCF.setPosition(position);
  });

  this.setPosition = function(offset){
    position = offset;
    jQuery.each(items, function(index, item){
      item.moveToPosition(offset + index);
    }) 
    if (options.onSetPosition) options.onSetPosition(offset);
  }

  this.loaded = function(){
    if (++loadedImgs == imgs.length)
      myCF.setPosition(0);
  }

  var CFItem = function(src, options){
    var myself    = this;
    myself.canvi  = {};
    myself.angle  = 0;
    myself.left   = 0;
    myself.top    = 0;
    myself.index  = items.length; 

    var reflectionRatio = 0.6;
    var reflectivity    = 0.4;
    var maxSize         = Math.floor(container.height()/(1+reflectionRatio));

    var reflectionCanvas;
    var img          = document.createElement('img');
    var finalCanvas  = createCanvas();
    var finalContext = finalCanvas.getContext('2d');

    if (options.onclick)        $(finalCanvas).bind('click', options.onclick);
    if (options.onclickCenter)  $(finalCanvas).bind('click', function(){ if (myself.angle == 0) options.onclickCenter(finalCanvas, myself.index, reflectionCanvas.geometry); });
    if (options.lightBox)       $(finalCanvas).bind('click', function(){ 
      if (myself.angle == 0) {
        var zoomImg     = document.createElement('img');
        zoomImg.src     = img.src;

        var canvasPos   = $(finalCanvas).offset();
        var original    = reflectionCanvas.geometry;
        var scaled      = scaleTo(original, Math.min($(window).width(), $(window).height()) - 100);

        var originalPos = {
          left:     canvasPos.left,
          top:      canvasPos.top + original.top,
          width:    original.width,
          height:   original.height
        };

        var zoomedPos = {
          width:  scaled.width,
          height: scaled.height,
          left:   canvasPos.left - (scaled.width - original.width) / 2,
          top:    ($(window).height() - scaled.height) / 2
        }; 

        $(zoomImg).css($.extend(originalPos, {
          position: 'absolute',
          zIndex:   10000
        })).appendTo('body');

        container.animate({ opacity: 0.3 }, 200);

        $(zoomImg).animate(zoomedPos, 200, 'swing', 
          function(){ 
            $(document).bind('click', function clk(){
              $(document).unbind('click', clk);

              container.animate({ opacity: 1 }, 200); 

              $(zoomImg).animate(originalPos, 200, 'swing', function(){ 
                $(zoomImg).remove();
              });
            }); 
          }
        );
      }
    }); 

    $(img).load(function(){
      reflectionCanvas   = drawReflection(img, maxSize, reflectionRatio, reflectivity, container.css('background-color'));
      finalCanvas.width  = reflectionCanvas.width;
      finalCanvas.height = reflectionCanvas.height;

      $(finalCanvas).css({
        position: 'absolute',
        zIndex:   items.length + 1,
        left:     -1000,
        width:    reflectionCanvas.width,
        height:   reflectionCanvas.height
      }).appendTo(container);

      if (options.prerender) for (var ang=-maxAngle; ang<=maxAngle; ang ++){ redraw(ang, false); }
      redraw(0, true);
      myCF.loaded();
    });
    img.src = src;

    function redraw(angle, show) {
      if (!myself.canvi[angle]) {
        var canvas    = createCanvas();
        canvas.width  = Math.floor(reflectionCanvas.width * Math.cos(angle * Math.PI / 180));
        canvas.height = reflectionCanvas.height;
        skew(canvas.getContext('2d'), reflectionCanvas, angle);
        myself.canvi[angle]  = canvas;
      }
      if (show) {
        finalCanvas.style.width = myself.canvi[angle].width+"px";
        finalCanvas.width       = myself.canvi[angle].width;
        finalContext.clearRect(0, 0, reflectionCanvas.width, reflectionCanvas.height);
        finalContext.drawImage(myself.canvi[angle], 0, 0);
      }
    }

    function createCanvas(){
      var canvas = document.createElement('canvas');
      if ($.browser.msie) {
        canvas=window.G_vmlCanvasManager.initElement(canvas); 
      }
      return canvas;
    }

    function spacer (x, dist){
      if (x==0) return 0;
      return 0.15 * dist * ((x<0) ? -1 : 1) * Math.sqrt(Math.abs(x));
    }

    myself.moveToPosition = function(val){
      if (myself.animation) return;
      val = 30 * (val - imgs.length + 1);
      var from  = {angle: myself.angle, left: myself.left, top: myself.top};
      var to    = {angle: Math.min(Math.max(val, -maxAngle), maxAngle) ,  left: val, top: (val == 0) ? 50 : 0 };
      var fps = 0;
      var lastAngle = myself.angle;
      myself.animation = jQuery(from).animate(to, {
        duration: 1000,
        step: function() {
          fps++;
          var newAngle = (options.noTurn) ? 0 : Math.floor(this.angle);
          if (newAngle != lastAngle) {
            redraw(newAngle, true);
            lastAngle = newAngle;
          }
          $(finalCanvas).css({
            left:   Math.floor(myCF.center - spacer(this.left, maxSize) - finalCanvas.width/2 ),
            zIndex: 2000 - Math.floor(Math.abs(this.left))
          });
          if (options.comeToFront)    finalCanvas.style.top     = this.top+"px";
          if (options.fadeInDistance) finalCanvas.style.opacity = Math.pow(0.99, Math.abs(newAngle));
        },
        complete: function(){
          myself.animation = null;
          myself.angle = Math.min(Math.max(val, -maxAngle), maxAngle); 
          myself.left  = val;
          myself.top   = (val == 0) ? 50 : 0;
          if (fps < 25) grid++;
          if (fps > 40 && grid > 3) grid --; 
        }
      });
    }

    function drawReflection(img,  maxSize,  ratio,  reflectivity, backgroundColor){
      // examples:                300       0.5     0.5           #ffffff

      var s = scaleTo(img, maxSize);
      var w = s.width;
      var h = s.height;
      var offset = (w > h) ? (w - h) : 0;

      var canvas    = createCanvas();
      canvas.width  = w;
      canvas.height = Math.max(w, h) * (1 + ratio);
      ctx           = canvas.getContext('2d');

      // draw the reflection image
      ctx.save();
      ctx.translate(0, offset + (2 * h));
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();

      // create the gradient effect
      ctx.save();
      ctx.translate(0, offset + h);
      ctx.globalCompositeOperation = 'destination-out';
      var grad = ctx.createLinearGradient( 0, offset + 0, 0, h * ratio );
      grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0, 'rgba(0, 0, 0, '+(1-reflectivity)+')');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, offset + h);

      // apply background color to the gradient
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle   = backgroundColor;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, 0 , w, h);
      ctx.restore();

      // draw the image
      ctx.save();
      ctx.translate(0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, 0, offset + 0, w, h);
      ctx.restore();

      canvas.geometry = { left: 0, top: offset, width: w, height: h };

      return canvas;
    }

    function skew(context, img, angle) {
      var cos = Math.cos(angle * Math.PI / 180);
      if (cos <= 0) return;

      var w = img.width;
      var h = img.height;

      var w2 = w * cos;
      if (w2 < 1) return;

      var scalingFactor     = 0.6 + 0.4 * cos;
      var sliceNum          = w2 / grid;
      var sliceWidthOrigin  = w / sliceNum;                    

      var sliceWidthDest    = sliceWidthOrigin * w2 / w;
      var heightDelta       = h * ((1 - scalingFactor) / sliceNum);

      for(var n = 0; n < sliceNum; n++) {
        sx = Math.floor(sliceWidthOrigin * n);
        sy = 0;
        sw = Math.floor(sliceWidthOrigin);
        sh = h;
  
        dx = n * sliceWidthDest;
        dy = (angle > 0) ? ((heightDelta * n) / 3) : heightDelta * sliceNum / 3 - heightDelta * n /3; 
        dw = sliceWidthDest;
        dh = (angle > 0) ? h - (heightDelta * n) : h * scalingFactor + heightDelta * n;

        try {
          context.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);	
        } catch (e) {
        }
      }
    }
  }

  jQuery.each(imgs, function(index, img){
    items.push(new CFItem(img, {
      onclick:        function(){myCF.setPosition(imgs.length - 1 - index);},
      onclickCenter:  options.onclick,
      lightBox:       options.lightBox
    }));
  }) 
};
