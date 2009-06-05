

var prettyPrint = (function(){
    
    /* These "util" functions are not part of the core
       functionality but are  all necessary - mostly DOM helpers */
    
    var util = {
        
        el: function(type, attrs) {
            
            var el = document.createElement(type), attr;
            
            /* Add attributes to el */
            for (attr in attrs) { el[attr] = attrs[attr]; }
            
            return el;
        
        },
        
        txt: function(t) {
            return document.createTextNode(t);
        },
        
        row: function(cells, attrs, cellType) {
            /* Creates new <tr> */
            
            var tr = util.el('tr'), td;
            
            util.forEach(cells, function(cell){
                
                if (cell === null) {
                    return;
                }
                
                /* Default cell type is <td> */
                td = util.el(cellType || 'td', attrs);
                
                if (cell.nodeType) {
                    /* IsDomElement */
                    td.appendChild(cell);
                } else {
                    /* IsString */
                    td.innerHTML = cell;
                }
                
                tr.appendChild(td);
            });
            
            return tr;
        },
        
        hRow: function(cells){
            /* Return new <th> */
            var colSpan = (cells.join(',').match(/,(?=,|$)/g) || []).length + 1;
            return util.row(cells, {
                colSpan: colSpan
            }, 'th');
        },
        
        table: function(headings, attrs){
            
            headings = headings || [];
            
            /* Creates new table: */
            var tbl = util.el('table', attrs),
                thead = util.el('thead'),
                tbody = util.el('tbody');
                
            if (headings.length) {
                tbl.appendChild(thead);
                thead.appendChild( util.hRow(headings) );
            }
            tbl.appendChild(tbody);
            
            return {
                /* Facade for dealing with table/tbody
                   Actual table node is this.node: */
                node: tbl,
                tbody: tbody,
                thead: thead,
                appendChild: function(node) {
                    this.tbody.appendChild(node);
                },
                addRow: function(){
                    this.appendChild(util.row.apply(util, arguments));
                    return this;
                }
            };
        },
        
        thead: function(tbl) {
            return tbl.getElementsByTagName('thead')[0];
        },
        
        forEach: function(arr, fn) {
            
            /* Helper: iteration */
            var len = arr.length, index = -1;
            
            while (len > ++index) {
                fn( arr[index], index, arr );
            }
            
            return true;
        },
        
        type: function(v){
            /* Returns type, e.g. "string", "number", "array" etc.
               Note, this is only used for precise typing. */
            if (v.nodeType) {
                if (v.nodeType === 1) {
                    return 'domelement';
                }
                if (v.nodeType === 3) {
                    return 'domtextnode';
                }
                return 'domnode';
            }
            return Object.prototype.toString.call(v).match(/\s(.+?)\]/)[1].toLowerCase();
        },
        
        events: {
            add : function(el, type, fn) {
                var handler = function(e) {
                    fn.call(el, e || window.event);
                };
                el.addEventListener ?
                    el.addEventListener( type, handler )
                    : el.attachEvent( 'on' + type, handler );
                return handler;
            }
        }
        
    };
    
    // Main..
    var prettyPrintThis = function(obj, successFn, maxDepth, currentDepth, stack) {
        
         /*
         *           obj :: Object to be printed                    
         *     successFn :: callback function (when complete)       
         *      maxDepth :: maximum depth ventured                  
         *  currentDepth :: Keep tracks of depth during recursion   
         *         stack :: of Objects - to check for circ. refs    
         */
        
        /* Defaults: */
        currentDepth = currentDepth || 0;
        maxDepth = maxDepth || 2;
        stack = stack || [obj];
        
        var table = util.table(['Name','Value']);
        
        var typeDealer = {
            'string' : function(){
                add( i, '"' + item + '"', type );
            },
            'number' : function() {
                add( i, item, type );
            },
            'regexp' : function() {
                
                var miniTable = util.table(['RegExp',null], {
                    className: type
                });
                
                var flags = util.table();
                
                flags
                    .addRow(['g', item.global])
                    .addRow(['i', item.ignoreCase])
                    .addRow(['m', item.multiline]);
                
                miniTable
                    .addRow(['source', '/' + item.source + '/'])
                    .addRow(['flags', flags.node])
                    .addRow(['lastIndex', item.lastIndex]);
                    
                add( i, miniTable.node, type );
            },
            'domelement' : function() {
                
            },
            'object' : function() {
                
                stack[stack.length] = item;
                
                if (currentDepth === maxDepth) {
                    var text = util.el('a', {
                        innerHTML: '[CIRCULAR REFERENCE]',
                        href: '#',
                        className: 'small',
                        onclick: function(){
                            alert('CL');
                            return false;
                        }
                    });
                    add( i, text, type );
                    
                } else {
                    
                    /* Here's the recursion: */
                    prettyPrintThis(
                        item,
                        function(tbl){
                            var thead = util.thead(tbl);
                            thead.insertBefore(
                                util.hRow(['a',null]),
                                thead.firstChild
                            );
                            tbl.className = 'object';
                            add( i, tbl, type);
                        },
                        maxDepth,
                        currentDepth + 1,
                        stack
                    );
                    
                }
                
            },
            'array' : function() {
                
                var miniTable = util.table(['Array(' + item.length + ')', null], {
                    className: 'array'
                });
                
                util.forEach(item, function(item,i){
                    miniTable.addRow([i,item]);
                });
                
                add(i, miniTable.node);
                
            },
            'function' : function() {
                var args = (item.toString().match(/\((.+?)\)/)||[,''])[1];
                add( i, 'function(<small>' + args + '</small>) {...}', type );
            }
        };
        
        function add(name, value, type) {
            
            /* add() needs to have access to scope of prettyPrint */
            table.appendChild(
                util.row([name, value], {
                    className: type || ''
                })
            );
            
            return true;
            
        };
            
        traverse: for (var i in obj) {
            
            try {
                
                var item = obj[i],
                    type = util.type(item),
                    dealer = typeDealer[ type ];
                
                /* Check for cirular references: */
                for (var o in stack) {
                    if (item === stack[o]) {
                        
                        var text = util.el('a', {
                            innerHTML: '[CIRCULAR REFERENCE]',
                            href: '#',
                            className: 'small',
                            onclick: function(){
                                alert('CL');
                                return false;
                            }
                        });
                        
                        add( i, text, type );
                        continue traverse;
                    }
                }
                
                if (dealer) {
                    dealer( item );
                } else {
                    add( i, item, type );
                }
                
            
            } catch(e) {
                /* When pretty-printing DOM elements, this try-catch is required
                   ... Some browsers just suck */
            }
            
        }
        
        successFn(table.node);
        
    };
    
    
    return function(obj, successFn, maxDepth, currentDepth, stack){
        
        if (typeof successFn !== 'function') {
            throw new Error('successFn required (function)');
        }
        
        prettyPrintThis(obj, successFn, maxDepth, currentDepth, stack);
        
    };
    
})();