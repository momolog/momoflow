if (typeof(console) == 'undefined') { console = { log : function(){} } }

YAHOO.util.Event.onDOMReady(function(){

	var myCoverFlow = new YAHOO.ext.CoverFlow('coverFlowTest', {
    height: 300, 
    width:  800,
    images: [
      {src: 'images/01.jpg', label: 'Wolfgang', onclick: function(e){ e.target.style.border="1px solid green"}},
      {src: 'images/02.jpg', label: 'Marc',     onclick: function(e){ alert(); }},
      {src: 'images/03.jpg', label: 'Frieda',   onclick: function(){}},
      {src: 'images/04.jpg', label: 'Marc',     onclick: function(){}},
      {src: 'images/05.jpg', label: 'Marc',     onclick: function(){}},
      {src: 'images/06.jpg', label: 'Peter',    onclick: function(){}},
      {src: 'images/07.jpg', label: 'Peter',    onclick: function(){}},
      {src: 'images/08.jpg', label: 'Frieda',   onclick: function(){}}
    ]
  });

	btn1 = new YAHOO.widget.Button('moveLeftButton',  {onclick: {fn: function(e, cf){ cf.selectNext() },      obj: myCoverFlow }});
	btn2 = new YAHOO.widget.Button('moveRightButton', {onclick: {fn: function(e, cf){ cf.selectPrevious() },  obj: myCoverFlow }});
});
