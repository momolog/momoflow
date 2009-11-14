  YAHOO.namespace("ext");

  Number.prototype.sign = function(){ return (this > 0) ? 1 : (this < 0) ? -1 : 0; }

	YAHOO.ext.CoverFlow = function(el, userConfig){
		this.init(el, userConfig || {});
	};
	
	var CoverFlow = YAHOO.ext.CoverFlow; 
	var Dom       = YAHOO.util.Dom;
	
	CoverFlow.DEFAULT_HEIGHT    = 300;
	CoverFlow.IMAGE_SEPARATION  = 50;
	
	CoverFlow.prototype = {
		images:           [],	
		coverFlowItems:   [],
		
		reflectionRatio:      0.3,   
		sideRatio:            0.3,
		
		perspectiveAngle:     20,
		imageZIndex:          1000,
		selectedImageZIndex:  9999,
		selectedItem:         0,
		
		moveQueue:            [],
		animationWorking:     false,
		
		init: function(el, userConfig){
		
			this.element = Dom.get(el);
			this.applyConfig(userConfig);
			
			if(userConfig.images)
				this.addImages(userConfig.images);
			
			this.attachEventListeners();
			this.createLabelElement();
		},
		
		applyConfig: function(config){
			this.containerHeight  = config.height   || CoverFlow.DEFAULT_HEIGHT;
			this.containerWidth   = config.width    || parseInt(Dom.getStyle(this.element.parentNode, 'width'));
			this.backgroundColor  = config.bgColor  || Dom.getStyle(this.element.parentNode, 'background-color');
			
			this.element.style.position   = 'relative';
			this.element.style.height     = this.containerHeight + 'px';
			this.element.style.width      = this.containerWidth + 'px';
			this.element.style.background = this.backgroundColor;
			this.element.style.overflow   = 'hidden';
		},
		
		addImages: function(images){
			this.images = [];
			this.imageCount = images.length;

			for(var i=0; i < images.length; i++){
				var img       = images[i];
				var image     = new Image();
				image.id      = Dom.generateId();
				image.index   = i;
				image.onclick = img.onclick;
				image.label   = img.label;
				
				image.style.visibility  = 'hidden';
				image.style.display     = 'none';

				this.element.appendChild(image);

				YAHOO.util.Event.on(image, 'load', function(e, image){
          this.images.push(image);
          if(!--this.imageCount){
            this.createCoverFlowItems();
            this.sortCoverFlowItems();
            this.initCoverFlow();
          }
        }, image, this);
				image.src = img.src;
			};		
			
		},
		
		initCoverFlow: function(){
			for(var i=0; i < this.coverFlowItems.length; i++){
				var item = this.coverFlowItems[i];
				
				var angle = 0;
				var direction;

				if(i==0){
					item.setZIndex(this.selectedImageZIndex);
					item.setLeft(this.getCenter() - item.element.width/2);
					item.isSelected(true);
					this.selectedItem = 0;
					this.showLabel(item.label);
				}else{
					angle = this.perspectiveAngle;
					direction = 1;
					item.setZIndex(this.imageZIndex - i);
					item.setLeft( this.getRightStart()+ (i - 1)* CoverFlow.IMAGE_SEPARATION);
					item.isSelected(false);
				}
				item.angle = angle;
				item.drawInPerspective(direction);
			}
		},
		
		createLabelElement: function(){
			var label             = document.createElement('div');
			label.className       = 'coverFlowLabel';
			label.id              = Dom.generateId();
			label.style.top       = (this.containerHeight * (1 + this.reflectionRatio) * 1.3) + 'px';
			label.style.width     = this.containerWidth + 'px';
			label.style.zIndex    = this.selectedImageZIndex + 10;
			this.labelElement     = this.element.appendChild(label);
		},
		
		showLabel: function(text){
			this.labelElement.innerHTML = text || '';
		},
		
		attachEventListeners: function(){
			new YAHOO.util.KeyListener(document, { keys:39 }, { fn:this.selectNext,     scope:this, correctScope:true } ).enable(); 
			new YAHOO.util.KeyListener(document, { keys:37 }, { fn:this.selectPrevious, scope:this, correctScope:true } ).enable();
		},
		
		select: function(e, coverFlowItem){
			var distance = this.selectedItem - coverFlowItem.index;
			for(var i=0; i < Math.abs(distance); i++)
			  this.move(-distance.sign());
		},
		
		selectNext: function(){
      this.move(1);
		},

		selectPrevious: function(){
      this.move(-1);
		},

    move: function(dir){
      var last = (dir == 1) ? this.coverFlowItems.length-1 : 0;

		  if(this.selectedItem == last) return;
			if(this.animationWorking) return this.moveQueue.push(dir);

			var animateItems = [];
			
			for(var i=0; i < this.coverFlowItems.length; i++){
        var item = this.coverFlowItems[i];
        if(i == this.selectedItem){
          if (dir == -1) animateItems.pop();

          item.setZIndex(this.imageZIndex);
          item.isSelected(false);
          animateItems.push({item: item, attribute:{angle: {start: 0, end: this.perspectiveAngle} } });

          item = this.coverFlowItems[i+dir];
          item.isSelected(true);
          animateItems.push({item: item, attribute:{angle: {start: this.perspectiveAngle, end: 0} } });
          this.showLabel(item.label);

          if (dir == 1) i++;
        } else {
          item.setZIndex(item.getZIndex() - 1);
          animateItems.push({item: item, attribute: {left: {start:item.getLeft(), end: item.getLeft() - dir * CoverFlow.IMAGE_SEPARATION} }});
        }
      }
			
			var animation = new CoverFlowAnimation({
          direction:      dir,
          center:         this.getCenter(),
          startLeftPos:   this.getLeftStart(),
          startRightPos:  this.getRightStart()
        }, 
        animateItems, 0.5
      );
	
			animation.onStart.subscribe(this.handleAnimationWorking, this);
			animation.onComplete.subscribe(this.handleQueuedMove, this);

			animation.animate();

      if(dir * this.selectedItem < dir * last)
        this.selectedItem += dir;
    },
		
		handleAnimationWorking: function(a, b, cf){
			cf.animationWorking = true;
		},
		
		handleQueuedMove: function(msg, data, cf){
			cf.animationWorking = false;

		  var dir;
			if (dir = cf.moveQueue.pop()) cf.move(dir);
		},
		
		getCenter: function(){
			return this.containerWidth / 2;
		},
		
		getRightStart: function() {
			return this.containerWidth * (1 - this.sideRatio);
		},
		
		getLeftStart: function() {
			return this.sideRatio * this.containerWidth;
		},
		
		sortCoverFlowItems: function(){
			function sortFunction(aCoverFlowItem, bCoverFlowItem){
				return aCoverFlowItem.index - bCoverFlowItem.index;
			}
			
			this.coverFlowItems.sort(sortFunction);
		},
		
		createCoverFlowItems: function(){
			this.coverFlowItems = [];
			for(var i=0; i<this.images.length; i++){
				var image = this.images[i];
        var scaled = this.scaledDimensions(image);
				var coverFlowItem = new CoverFlowItem(image, {
					scaledWidth:      scaled.width, 
					scaledHeight:     scaled.height, 
          reflectionRatio:  this.reflectionRatio,
					bgColor:          this.backgroundColor,
					onclick: {fn: this.select, scope: this}
				});
        coverFlowItem.element.style.position = 'absolute';
        coverFlowItem.setTop((this.containerHeight - coverFlowItem.canvas.height) / 2);
				this.coverFlowItems.push(coverFlowItem);
			};
			delete this.images;
		},
		
    scaledDimensions: function(image){
			var factor = 1.0, width = image.width, height = image.height; 
      var maxWidth = this.containerWidth, maxHeight = this.containerHeight / (1 +this.reflectionRatio);

			if (height > maxHeight && width < maxWidth){
				factor =  maxHeight / height;
      } else if (height < maxHeight && width > maxWidth){
				factor =  maxWidth / width;
      } else if (height > maxHeight && width > maxWidth){
				factor = (height > width) ? maxHeight / height : maxWidth / width;
			}

			return {width: width * factor, height: height * factor};
		},

	};
	
  /****************/
  
	CoverFlowItem = function(image, options){
	 this.init(image, options);
	};
	
	CoverFlowItem.prototype = {
		label:      null,
		element:    null,
		index:      null,
		id:         null,
		angle:      0,
		selected:   false,
		
		init: function(image, options){
			this.index              = image.index;
			this.onclick            = options.onclick;
			this.selectedOnclickFn  = image.onclick;
			this.label              = image.label;

			var parent = image.parentNode;
			this.canvas     = this.createImageCanvas(image, options);
			this.element    = this.canvas.cloneNode(false);
			this.element.id = image.id;

			parent.replaceChild(this.element, image);
			
			this.onSelected = new YAHOO.util.CustomEvent('onSelected', this);

			this.onSelected.subscribe(function(){
        YAHOO.util.Event.removeListener(this.element, 'click');
        YAHOO.util.Event.addListener   (this.element, 'click', (this.selected) ? this.selectedOnclickFn : this.onclick.fn, this, this.onclick.scope);
      });
		},
		
		isSelected: function(selected){
			this.selected = selected;
			this.onSelected.fire();
		},
		
		setTop: function(top){
			this.element.style.top = top + 'px'; 
		},
		
		setLeft: function(left){
			this.element.style.left = Math.ceil(left) + 'px';
		},
		
		getLeft: function(){
			var ret = this.element.style.left;
			return new Number(ret.replace("px", ""));
		},
		
		getZIndex: function(){
			return this.element.style.zIndex;
		},
		
		setZIndex: function(zIndex){
			this.element.style.zIndex = zIndex;
		},
		
		createImageCanvas: function(image, options){
			var imageCanvas = document.createElement('canvas');
			
			if(imageCanvas.getContext){
				
				var scaledWidth   = options.scaledWidth;
				var scaledHeight  = options.scaledHeight;
				
				imageCanvas.height = (1 + options.reflectionRatio) * scaledHeight; // reflection
				imageCanvas.width = scaledWidth;
				
				var ctx = imageCanvas.getContext('2d');
			
				ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
				ctx.globalCompositeOperation = 'source-over';
				ctx.fillStyle = 'rgba(0, 0, 0, 1)';
				ctx.fillRect(0, 0, imageCanvas.width, imageCanvas.height);
				
				//draw the reflection image
				ctx.save();
				ctx.translate(0, (2*scaledHeight));
				ctx.scale(1, -1);
				ctx.drawImage(image, 0, 0, scaledWidth, scaledHeight);
				ctx.restore();
				//create the gradient effect
				ctx.save();
				ctx.translate(0, scaledHeight);
				ctx.globalCompositeOperation = 'destination-out';
				var grad = ctx.createLinearGradient( 0, 0, 0, scaledHeight * options.reflectionRatio );
				grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
				grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
				ctx.fillStyle = grad;
				ctx.fillRect(0, 0, scaledWidth, scaledHeight);
				//apply the background color to the gradient
				ctx.globalCompositeOperation = 'destination-over';
				ctx.fillStyle = options.bgColor;
				ctx.globalAlpha = 0.8;
				ctx.fillRect(0, 0 , scaledWidth, scaledHeight);
				ctx.restore();
				//draw the image
				ctx.save();
				ctx.translate(0, 0);
				ctx.globalCompositeOperation = 'source-over';
				ctx.drawImage(image, 0, 0, scaledWidth, scaledHeight);
				ctx.restore();
				
				return imageCanvas;
			}
		},
		
		drawInPerspective: function(direction, frameSize){
			var canvas  = this.element;
			var image   = this.canvas;
			var ctx     = canvas.getContext('2d');

			var angle   = Math.ceil(this.angle);
			var originalWidth     = image.width;
			var originalHeight    = image.height;
			var destinationWidth  = originalWidth;  // for future use
			var destinationHeight = originalHeight; // for future use
			
			var alpha = angle * Math.PI/180;
			
			if (alpha > 0) { 
        // if we have an angle greater than 0 then apply the perspective

        var perspectiveCanvas     = document.createElement('canvas');
        perspectiveCanvas.height  = destinationHeight;
        perspectiveCanvas.width   = destinationWidth;
        var perspectiveCtx        = perspectiveCanvas.getContext('2d');

				var right = (direction == -1);

				var initialX=0, finalX=0, initialY=0, finalY=0;

				frameSize = frameSize || 1;
				var xDes, yDes;
				var heightDes, widthDes;
				var perspectiveWidht = destinationWidth;
				
				var frameFactor = frameSize / originalWidth;
				var frames = Math.floor(originalWidth / frameSize);
	
				var widthSrc = frameSize ;
				var heightSrc = originalHeight;
				
				for(var i=0; i < frames; i++){
					var xSrc = (i) * frameSize;
					var ySrc = 0;
					width   = destinationWidth * (i) * frameFactor;
					horizon = destinationHeight / 2;
	
					if (right){
						betaTan = horizon/((Math.tan(alpha)*horizon) + width);
						xDes    = (betaTan*width)/(Math.tan(alpha) + betaTan);
						yDes    = Math.tan(alpha) * xDes;
						
						if(i == frames -1){
							finalX = xDes;
							finalY = yDes;
						}
					} else {
						betaTan = horizon/((Math.tan(alpha)*horizon) +(destinationWidth-width));
						xDes = (Math.tan(alpha)*(destinationWidth) + (betaTan * width))/(Math.tan(alpha) + betaTan);
						yDes = -Math.tan(alpha)*xDes + (Math.tan(alpha)*(destinationWidth));
						
						if(i == 0){
							initialX = xDes;
							initialY = yDes;
							finalX = destinationWidth;
							finalY = 0;
						}
					}
	
					heightDes = destinationHeight - (2*yDes);
					widthDes = heightDes / destinationHeight * destinationWidth;
					
					perspectiveCtx.drawImage(image, xSrc, ySrc, widthSrc, heightSrc, xDes, yDes, widthDes, heightDes);
			
				}

				perspectiveWidth = finalX - initialX;
				canvas.width = perspectiveWidth;
				
				//remove exceeded pixels
				ctx.beginPath();
				if (right){
					ctx.moveTo(0, 0);
					ctx.lineTo(finalX, finalY);
					ctx.lineTo(finalX, finalY + (destinationHeight - 2*finalY));
					ctx.lineTo(0, destinationHeight);
					ctx.lineTo(0,0);
				} else {
					var initialX1 = initialX - (destinationWidth - perspectiveWidth);
					var finalX1   = finalX   - (destinationWidth - perspectiveWidth);
					ctx.moveTo(0, initialY);
					ctx.lineTo(finalX1, finalY);
					ctx.lineTo(finalX1, destinationHeight);
					ctx.lineTo(initialX1, initialY + (destinationHeight - 2*initialY));
					ctx.lineTo(0, initialY);
				}
				ctx.closePath();
				ctx.clip();
				
				ctx.drawImage(perspectiveCanvas, initialX, 0, perspectiveWidth, destinationHeight, 0, 0, perspectiveWidth, destinationHeight);
			
			} else {
				canvas.width  = destinationWidth;
				canvas.height = destinationHeight;
				ctx.drawImage(image, 0, 0, originalWidth, originalHeight, 0, 0, destinationWidth, destinationHeight);
			}
		}
		
	};
	
	/**
	 * @class CoverFlowAnimation
	 * @requires YAHOO.util.AnimMgr
	 */
	CoverFlowAnimation = function(options, animationItems, duration){
		this.init(options, animationItems, duration);
	};	
	
	CoverFlowAnimation.prototype = {
		method:         YAHOO.util.Easing.easeNone,
		animated:       false,
		useSeconds :    true, // default to seconds
			
		init: function(options, animationItems, duration){
			this.direction      = options.direction;
			this.center         = options.center;
			this.startLeftPos   = options.startLeftPos;
			this.startRightPos  = options.startRightPos;
			this.animationItems = animationItems;
	    this.duration       = duration || 1;
	    this.registerEvents();
		},
		
		registerEvents: function(){
      this._onStart     = new YAHOO.util.CustomEvent('_start',     this, true);
      this.onStart      = new YAHOO.util.CustomEvent('start',      this);
      this._onTween     = new YAHOO.util.CustomEvent('_tween',     this, true);
      this.onComplete   = new YAHOO.util.CustomEvent('complete',   this);
      this._onComplete  = new YAHOO.util.CustomEvent('_complete',  this, true);

      this._onStart.subscribe(this.doOnStart);
      this._onTween.subscribe(this.doOnTween);
      this._onComplete.subscribe(this.doOnComplete);			
		},
        
        isAnimated : function() {
            return this.animated;
        },
        
        getStartTime : function() {
            return this.startTime;
        },      
        
        calcInterValue : function(start, end) {
            return this.method(this.currentFrame, start, end - start, this.totalFrames);
        },        
        
        animate : function() {
            if ( this.isAnimated() ) return false; 
            
            this.currentFrame = 0;
            
            this.totalFrames = ( this.useSeconds ) ? Math.ceil(YAHOO.util.AnimMgr.fps * this.duration) : this.duration;
    
            if (this.duration === 0 && this.useSeconds) { // jump to last frame if zero second duration 
                this.totalFrames = 1; 
            }
            YAHOO.util.AnimMgr.registerElement(this);
            return true;
        },
          
        stop : function(finish) {
            if (!this.isAnimated()) return false;

            if (finish) {
                 this.currentFrame = this.totalFrames;
                 this._onTween.fire();
            }
            YAHOO.util.AnimMgr.stop(this);
        },
        
        doOnStart : function() {            
          this.onStart.fire();
          
          this.runtimeItems = [];
          for (var i=0; i<this.animationItems.length; i++) {
            this.setRuntimeItem(this.animationItems[i]);
          }
          
          this.animated = true;
          this.startTime = new Date(); 
        },
        
        doOnTween : function() {
          for (var i=0; i < this.runtimeItems.length; i++) 
            this.setItemAttributes(this.runtimeItems[i]); 
        },
        
        doOnComplete : function() {
          this.animated = false;
          this.onComplete.fire({});
        },
        
        setRuntimeItem: function(item){
        	var runtimeItem = {
            item:       item.item,
            attribute:  item.attribute
          };
        	for(var attr in item.attribute){
        		if(attr == 'angle'){
              var sign = (item.attribute[attr].start - item.attribute[attr].end).sign();
        			runtimeItem.attribute[attr].perspectiveDirection = this.direction * sign;
        			runtimeItem.attribute[attr].center = (sign == 1);
        		}
        	}
        	this.runtimeItems.push(runtimeItem);
        },
        
        setItemAttributes: function(item){
          var cfItem = item.item;
          var atts = item.attribute;
        	for(var key in atts){
            var attr  = atts[key];
        		var value = this.calcInterValue(attr.start, attr.end);
            var left  = value;
        		
        		if(key == 'angle'){
        		  var targetPos;
              cfItem.angle  = value;
        			cfItem.drawInPerspective(attr.perspectiveDirection, this.calcInterValue(3, 1));

        			if(attr.center){
        				targetPos = this.center - cfItem.element.width/2;
        			} else {
        				if(this.direction == 1)
        					targetPos = this.startLeftPos - cfItem.element.width;
        				else
        					targetPos = this.startRightPos;
        			}
        			left = this.calcInterValue(cfItem.getLeft(), targetPos);
        		} 
        	  cfItem.setLeft(left);
        	}
        }
	};
	
//});
