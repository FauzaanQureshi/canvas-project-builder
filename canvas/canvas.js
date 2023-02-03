/**GLOBAL variables */{
    var PROJECT = null;
    var CONTEXT = {};
    var MARGIN = 15; //px
    var COLOR = [
        [0, 128, 255],
        [0, 255, 128],
        [255, 0, 128],
        [255, 128, 0],
        [128, 0, 255],
        [128, 255, 0],
    ];
    var SHOW_HIERARCHY = false;
    var UNSAVED = false;
}

/**Utility Functions */{
    function THEME(){
        THEME._theme = !THEME._theme;
        return THEME._theme;
    }
    function parse_data_attr(text) {
        return text.replace(/(.)([A-Z][a-z]+)/, '$1-$2').replace(/([a-z0-9])([A-Z])/, '$1-$2').toLowerCase()
    }
    function apply_data_properties($node, data){
        /**
         * For css: $.css(prop, value)
         *  data-css-<prop>='<value>'
         *      Examples:
         *          data-css-right='12px'
         *          data-css-box-shadow='inset 1 1 0 red'
         * 
         * For jquery functions expecting object $.fn({key:value})
         *  data-obj-<function>-<key>='<value>'
         *      Examples:
         *          data-obj-offset-left='100'
         *          data-obj-offset-top='100'
         * 
         * For jquery functions expecting args $.fn(key, value)
         *  data-arg-<function>-<key>='<value>'
         * 
         * Default: $.function(value)
         *  data-<function>='<value>'
         *      Examples:
         *          data-height='50'
         *          data-width='80'
         */
        var attr, val;
        Object.entries(data).forEach(item=>{
            attr = parse_data_attr(item[0]);
            val = item[1];
            if (attr.startsWith('css-')){
                attr = attr.slice(4);
                $node.css(attr, val);
            } else if (attr.startsWith('obj-')){
                attr = attr.slice(4);
                var prop = attr.slice(0, attr.indexOf('-'));
                attr = attr.slice(attr.indexOf('-')+1);
                $node[prop]({attr: val});
            } else if (attr.startsWith('arg-')){
                attr = attr.slice(4);
                var prop = attr.slice(0, attr.indexOf('-'));
                attr = attr.slice(attr.indexOf('-')+1);
                $node[prop](attr, val);
            } else{
                $node[attr](val);
            }
            $node = $node
        });
        return $node;
        /*if (data.height)
            $node.height(data.height);
        if (data.width)
            $node.width(data.width);
        if (data.left)
            $node.css('left', data.left);
        if (data.right)
            $node.css('right', data.right);
        if (data.top)
            $node.css('top', data.top);
        if (data.bottom)
            $node.css('bottom', data.bottom);
        if (data.offsetLeft)
            $node.offset({left: data.offsetLeft});
        if (data.offsetTop)
            $node.offset({left: data.offsetTop});
        return $node;*/
    }
    function set_unsaved(val){
        if (val){
            $('title').text(
                $('title').text()+'*'
            );
        } else {
            if ($('title').text().endsWith('*'))
                $('title').text(
                    $('title').text().split('*', 1)[0]
                );
        }
        UNSAVED = val;
    }
}

function register_node($node){
    if (!(
        $node.hasClass('module') ||
        $node.hasClass('class') ||
        $node.hasClass('method') ||
        $node.hasClass('member') ||
        $node.hasClass('list-group') ||
        $node.hasClass('members') ||
        $node.hasClass('methods')
    )){
        return false;
    }
    if (    
        $node.hasClass('list-group') ||
        $node.hasClass('members') ||
        $node.hasClass('methods')
    ){
        $node.children().each((_, child) => {
            register_node($(child));
        });
        return true;
    }

    if ($node.hasClass('module')){
        new bootstrap.Tooltip($node[0])
    }
    if ($node.hasClass('class')){
        $node.hover(function(){
            if (SHOW_HIERARCHY){
                function _hover_in(cls){
                    var klass = Class.getClassFromName(cls);
                    klass.children.forEach(child=>{
                        $('.class[name="'+child.toString()+'"]').addClass('subclass');
                        _hover_in(child);
                    });
                }
                _hover_in($node.attr('name'));
                $node.addClass('baseclass');
            }
        }, function(){
            if (SHOW_HIERARCHY){
                function _hover_out(cls){
                    var klass = Class.getClassFromName(cls);
                    klass.children.forEach(child=>{
                        $('.class[name="'+child.toString()+'"]').removeClass('subclass');
                        _hover_out(child);
                    });
                }
                _hover_out($node.attr('name'));
                $node.removeClass('baseclass');
            }
        });
    }
    function _move(e){
        e.preventDefault();
        if ($('.dragstart').length && ($node.hasClass('module') || $node.hasClass('class'))) {
            e.stopPropagation();
            const offset = JSON.parse($node.data('offset'));
            let left = (e.clientX + offset[0]);
            let top = (e.clientY + offset[1]);
            if (left > 0)
                $node.css('left',  left + 'px');
            else {
                left = $node.parent().offset().left - $node.offset().left;
                if (left < 0){
                    left = 0;
                    $node.siblings().each((_, child)=>{
                        if ($(child).hasClass('class') || $(child).hasClass('module')){
                            $(child).offset(
                                {
                                    left: (
                                        $(child).offset().left - left + MARGIN
                                    ),
                                }
                            );
                        }
                    });
                }
                $node.parent().width(
                    $node.parent().width() + left + MARGIN
                );
            }
            if (top > 0)
                $node.css('top',  top + 'px');
            else {
                top = $node.parent().offset().top - $node.offset().top;
                if (top < 0){
                    top = 0;
                    $node.siblings().each((_, child)=>{
                        if ($(child).hasClass('class') || $(child).hasClass('module')){
                            $(child).offset(
                                {
                                    top: (
                                        $(child).offset().top - top + MARGIN
                                    ),
                                }
                            );
                        }
                    });
                }
                $node.parent().height(
                    $node.parent().height() + top + MARGIN
                );
            }
            // $node.css('top',  top + 'px');
            
        }
    }
    $node.mousedown(function(e){
        e.preventDefault();
        if ($node.hasClass('module') || $node.hasClass('class')){
            if (
                $node.hasClass('module') && 
                Math.abs($(e.currentTarget).offset().left + $(e.currentTarget).width() - e.clientX) <= 0.03*e.clientX &&
                Math.abs($(e.currentTarget).offset().top + $(e.currentTarget).height() - e.clientY) <= 0.03*e.clientY
            )
                return false;
            const offset = [
                parseFloat($(e.currentTarget).css('left')) - e.clientX,
                parseFloat($(e.currentTarget).css('top')) - e.clientY
            ];
            $(e.currentTarget).data('offset', JSON.stringify(offset));
            $(e.currentTarget).addClass('dragstart');
        }
        
        window.addEventListener('mousemove', _move);
        window.addEventListener('mouseup', function _up(e){
            e.preventDefault();
            e.stopPropagation();
            window.removeEventListener('mousemove', _move);
            window.removeEventListener('mouseup', _up);
        });
        e.stopPropagation();
    });
    
    $node.bind('contextmenu', function(e){
        var top = e.pageY+5;
        var left = e.pageX;
        $('.context-menu').hide();
        // Show contextmenu
        let selector = '.context-menu';
        if ($node.hasClass('module')){
            selector += '.cm-module'
        } else if ($node.hasClass('class')){
            selector += '.cm-class'
        } else if ($node.hasClass('method')){
            selector += '.cm-method'
        } else if ($node.hasClass('member')){
            selector += '.cm-member'
        }
        $(selector).toggle(10).css({
            top: top + 'px',
            left: left + 'px'
        });
        CONTEXT = {
            target: e.currentTarget,
            clientX: e.offsetX,
            clientY: e.offsetY,
        };
        
        return false;
    });

    $node.children().each((_, child) => {
        register_node($(child));
    });

    $node.find('.resizer').mousedown(function(e){
        e.preventDefault();
        e.stopPropagation();
        function _resize(e){
            $node.width(
                e.pageX - $node.offset().left
            );
            $node.height(
                e.pageY - $node.offset().top
            );
        }
        window.addEventListener('mousemove', _resize);
        window.addEventListener('mouseup', function _stop(e){
            e.preventDefault();
            e.stopPropagation();
            window.removeEventListener('mousemove', _resize);
            window.removeEventListener('mouseup', _stop);
        });
    });
}

$(document).ready(function(){
    register_node($('.module'));
    render_docstring($('.module'));
    
    $(document).mouseup(function(e){
        $('.dragstart').removeClass('dragstart');
    });
    
    $(document).bind('contextmenu', function(e){
        e.stopPropagation();
        var top = e.pageY+5;
        var left = e.pageX;
        $('.context-menu').hide();
        $('.cm-main').toggle(10).css({
            top: top + 'px',
            left: left + 'px'
        });
        CONTEXT = {
            target: e.currentTarget,
            clientX: e.pageX,
            clientY: e.pageY,
        };
        return false;
    });
    $(document).bind('click',function(){
        $('.context-menu').hide();

        setTimeout(() => {
            $('.module').children().each(function(_, child){
                var $child = $(child);
                var $parent = $child.parent();
                if ($child.hasClass('module') || $child.hasClass('class')){
                    let left = ($child.offset().left - $parent.offset().left) - MARGIN;
                    let right = (
                            ($parent.offset().left + $parent.width()) - 
                            ($child.offset().left + $child.width())
                        ) - MARGIN + 0.0014168945312391656;
                    let top = ($child.offset().top - $parent.offset().top) - MARGIN + 2.2698678466796878;
                    let bottom = (
                            ($parent.offset().top + $parent.height()) - 
                            ($child.offset().top + $child.height())
                        ) - MARGIN + 2.5389999999999873;
                    
                    if (left<0){
                        $parent.width($parent.width()-left);
                    }
                    if (right<0)
                        $parent.width($parent.width()-right);
                    if (top<0){
                        $parent.height($parent.height()-top);
                    }
                    if (bottom<0)
                        $parent.height($parent.height()-bottom);
                }
            });
        }, 50);
    }).click();
    $(document).on('shown.bs.modal', function (e) {
        $('[autofocus]', e.target).focus();
    });
    $('#error-modal').on('hidden.bs.modal', function(){
        $('#error-modal p').text('');
    });

    window.onbeforeunload = function (){
        if (UNSAVED)
            return "Project not saved";
        return;
    }
});

/**Render Functions */{
    function render_docstring($node){
        const info = `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='white' class='bi bi-info-circle' viewBox='0 0 16 16' style='padding: 0;'>
        <path d='M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z'/>
        <path d='m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z'/>
    </svg>`;
        const add = `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='white' class='bi bi-plus-circle' viewBox='0 0 16 16'>
        <path d='M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z'/>
        <path d='M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z'/>
    </svg>`;

        function button(docstring){
            let start = `<button class='description' 
                data-bs-toggle='modal'
                data-bs-target='#doc-string-modal'
                data-bs-placement='top'
                data-bs-html='true'
                title=`;
            let end = `</button>`;
            if (docstring.length == 0){
                start += `'Add Docstring'>`;
                return start+add+end;
            } else {
                start += `'<em>`+docstring+`</em>'>`;
                return start+info+end;
            }
        };


        $node.find('doc-string')
            .each((_, child) => {
                let $node_btn = $(button($(child).text()));
                $node_btn.addClass($(child).attr('class'));
                new bootstrap.Tooltip($node_btn[0]);
                $(child).replaceWith(
                    $node_btn[0]
                );
            });
    }
    function render_module($node){
        
        function _module(module/*ModuleObject*/, docstring){
            return `<div class="module" title="`+module.name+`" name="`+module.toString()+`">`+
            `  <div class="resizer"></div>`+
            `  <doc-string>`+docstring+`</doc-string>`+
            `</div>`;
        }
        var html, offset, data, $module, docstring;
        if ($node.is('template-module')){
            html = $node.html();
            offset = $node.offset();
            data = $node.data();
            docstring = $node.children('doc-string').text();
            $module = $(_module(
                Module.getModule($node.attr('name')),
                docstring
            ));

            $module.html(
                html + $module.html()
            );
            $module.offset(offset);
            $module = apply_data_properties($module, data);
            register_node($module);
            $node.replaceWith($module);
            $node = $module;
        }else{
            while(m = $node.find('template-module')[0]){
                html = $(m).html();
                offset = $(m).offset();
                data = $(m).data();
                docstring = $(m).children('doc-string').text();
                $module = $(_module(
                    Module.getModule($(m).attr('name')),
                    docstring
                ));
                $module.html(
                    html + $module.html()
                )
                $module = apply_data_properties($module, data);
                register_node($module);
                $(m).replaceWith($module);
            };
        }
        return $node;
    }
    function render_class($node){
        function _class(klass/*ClassObject*/, members, methods, docstring){
            return `<div class="class" name="`+klass.toString()+`">`+
              `<ul class="list-group list-group-flush">`+
                `<li class="classname list-group-item">`+
                    `<h3>`+klass.name+`</h3>`+
                `</li>`+
                `<li class="list-group-item members">`+
                    members+
                `</li>`+
                `<li class="list-group-item methods">`+
                    methods+
                `</li>`+
              `</ul>`+
              `<doc-string>`+docstring+`</doc-string>`+
            `</div>`;
        }
        var offset, data, $class, members, methods, docstring;
        if ($node.is('template-class')){
            members = $node.find('class-member').map((_, e) => e.outerHTML).get().join('\n');
            methods = $node.find('class-method').map((_, e) => e.outerHTML).get().join('\n');
            offset = $node.offset();
            data = $node.data();
            docstring = $node.children('doc-string').text();
            $class = $(_class(
                Class.getClassFromName($node.attr('name')),
                members,
                methods,
                docstring
            ));

            $class.offset(offset);
            $class = apply_data_properties($class, data);
            register_node($class);
            $node.replaceWith($class);
            $node = $class;
        } else{
            while(klass = $node.find('template-class')[0]){
                    members = $(klass).find('class-member').map((_, e) => e.outerHTML).get().join('\n');
                    methods = $(klass).find('class-method').map((_, e) => e.outerHTML).get().join('\n');
                    offset = $(klass).offset();
                    data = $(klass).data();
                    docstring = $(klass).children('doc-string').text();
                    $class = $(_class(
                        Class.getClassFromName($(klass).attr('name')),
                        members,
                        methods,
                        docstring
                    ));
        
                    $class.offset(offset);
                    $class = apply_data_properties($class, data);
                    register_node($class);
                    $(klass).replaceWith($class);
                };
        }
        return $node;
    }
    function render_member($node){
        function _member(member/*MemberObject*/, docstring){
            return `<div class="member`+(member.is_property?' highlight':'')+`" name='`+member.toString()+`'`+
                ` data-bs-placement='top'`+
                ` data-bs-html='true'`+
                ` title='`+
            (member.access?(member.access+` `):'')+
            (member.is_static?'static ':'')+
            member.name+` `+
            (member.type?(`: `+member.type+` `):'')+
            (member.value?(`= `+member.value):'')+
            `'>`+
                ` <doc-string class="description-rel">`+docstring+`</doc-string>`+
            member.name+
            `</div>`;
        }
        var klass, member, docstring, $member;
        if ($node.is('class-member')){
            klass = $node.parents('.class').attr('name');
            member = $node.attr('name').slice(klass.length+2, $node.attr('name').indexOf('<'));
            member = Class.getClassFromName(klass).members.find(m=>m.name==member);
            docstring = $node.children('doc-string').text();
            $member = $(_member(
                member,
                docstring
            ));
            
            new bootstrap.Tooltip($member[0]);
            $node.replaceWith($member);
            $node = $member;
        } else{
            $node.find('class-member')
            .each((_, m)=>{
                klass = $(m).parents('.class').attr('name');
                member = $(m).attr('name').slice(klass.length+2, $(m).attr('name').indexOf('<'));
                member = Class.getClassFromName(klass).members.find(m=>m.name==member);
                docstring = $(m).children('doc-string').text();
                $member = $(_member(
                    member,
                    docstring
                ));
                    
                new bootstrap.Tooltip($member[0]);
                $(m).replaceWith($member);
            });
        }
        return $node;
    }
    function render_method($node){
        var klass, method, docstring, $method, overload_method;

        function _method(method/*MethodObject*/, docstring){
            return `<div class='method`+(method.is_constructor?' highlight':'')+`' name='`+method.toString()+`'>`+
                `<doc-string class='description-rel'>`+docstring+`</doc-string>`+
            method.name+
            `</div>`;
        }
        function _overloading_div(method){
            return [
                `<div class='overloaded-method`+(method.is_constructor?' highlight':'')+`' name='`+method.name+`' data-bs-toggle='collapse' data-bs-target='.class[name="`+method.class.toString()+`"] .collapse[name=`+method.name+`]' aria-expanded='false'>`+
                    method.name+
                    `<span class='position-relative top-0 start-0 badge rounded-pill bg-dark'>2</span>`+
                `</div>`,
                `<div class='collapse overloads'  name='`+method.name+`'>`+
                `</div>`
            ];
        }

        if ($node.is('class-method')){
            klass = $node.parents('.class').attr('name');
            method = $node.attr('name').slice(klass.length+2, $node.attr('name').indexOf('('));
            overload_method = Class.getClassFromName(klass).methods.filter(m=>
                m.name==method && m.toString()!=$node.attr('name')
            );
            method = Class.getClassFromName(klass).methods.find(m=>m.toString()==$node.attr('name'));
            if (overload_method.length > 0){
                if (
                    $node.parents('.class')
                    .find('.overloaded-method[name="'+method.name+'"]')
                    .length > 0
                )
                    overload_method = 'EXISTS';
                else
                    overload_method = $('.method[name="'+overload_method[0].toString()+'"]');
            } else {
                overload_method = false;
            }
            docstring = $node.children('doc-string').text();
            $method = $(_method(
                method,
                docstring
            ));
            if (overload_method=="EXISTS"){
                $node.parents('.class')
                    .find('.overloads[name="'+method.name+'"]')
                    .append($method);

                $badge = $node.parents('.class')
                    .find('.overloaded-method[name="'+method.name+'"] .badge');
                
                $badge.text(Number($badge.text())+1);
                $node.remove();
            } else{
                if (overload_method){ /**CREATE OVERLOAD */
                    var overloading_div = _overloading_div(method);
                    overload_method.wrap(overloading_div[1]);
                    overload_method.after($method);
                    overload_method.parent().before(overloading_div[0]);
                    $node.remove();
                } else {
                    $node.replaceWith($method);
                }
            }
            $node = $method;
        } else{
            $node.find('class-method')
            .each((_, m)=>{
                klass = $(m).parents('.class').attr('name');
                method = $(m).attr('name').slice(klass.length+2, $(m).attr('name').indexOf('('));
                overload_method = Class.getClassFromName(klass).methods.filter(_m=>
                    _m.name==method && _m.toString()!=$(m).attr('name')
                );
                method = Class.getClassFromName(klass).methods.find(_m=>_m.toString()==$(m).attr('name'));
                if (overload_method.length > 0){
                    if (
                        $(m).parents('.class')
                        .find('.overloaded-method[name="'+method.name+'"]')
                        .length > 0
                    )
                        overload_method = 'EXISTS';
                    else
                        overload_method = $('.method[name="'+overload_method[0].toString()+'"]');
                } else {
                    overload_method = false;
                }
                docstring = $(m).children('doc-string').text();
                $method = $(_method(
                    method,
                    docstring
                ));
                if (overload_method=="EXISTS"){
                    $(m).parents('.class')
                        .find('.overloads[name="'+method.name+'"]')
                        .append($method);
    
                    $badge = $(m).parents('.class')
                        .find('.overloaded-method[name="'+method.name+'"] .badge');
                    
                    $badge.text(Number($badge.text())+1);
                    $(m).remove();
                } else{
                    if (overload_method){ /**CREATE OVERLOAD */
                        var overloading_div = _overloading_div(method);
                        overload_method.wrap(overloading_div[1]);
                        overload_method.after($method);
                        overload_method.parent().before(overloading_div[0]);
                        $(m).remove();
                    } else {
                        $(m).replaceWith($method);
                    }
                }
            });
        }
        return $node;
    }
}

/** Add Functions*/{
    function add_module(event){
        if (!event){
            set_unsaved(true);;
            if (!Module.validate_name($('#add-module-modal input').val())){
                $('#add-module-modal .error').html('Illegal or Existing Module name');
                return false;
            }

            $('#add-module-modal .error').html('');
            var parent = 'main';
            if ($(CONTEXT.target).hasClass('module')){
                parent = Module.getModule(
                    $(CONTEXT.target).attr('name')
                );
            }
            var module = new Module(
                $('#add-module-modal input').val(),
                parent,
            );
            var $node = $(
                `<template-module name='`+module.toString()+`'></template-module>`
            );
            if (parent.toString() === 'main'){
                $node.insertBefore('.cm-main');
            } else {
                $(CONTEXT.target).append($node);
            }
            $node.offset({
                top: CONTEXT.clientY,
                left: CONTEXT.clientX
            });
            $node = render_module($node);
            render_docstring($node);
            $('#add-module-modal').modal('hide');
        } else{
            $('#add-module-modal .error').html('');
            $('#add-module-modal form')[0].reset()
            $('#add-module-modal').modal('show');
        }
    }
    function add_class(event){
        if (!event){
            set_unsaved(true);;
            var module = 'main';
            var base = null;
            var $target;
            if ($(CONTEXT.target).hasClass('module')){
                module = Module.getModule(
                    $(CONTEXT.target).attr('name')
                );
                $target = $(CONTEXT.target);
            } else if($(CONTEXT.target)[0] != document){
                if ($(CONTEXT.target).parents('.module').length>0){
                    module = Module.getModule(
                        $(CONTEXT.target).parents('.module').attr('name')
                    );
                    $target = $(CONTEXT.target).parents('.module');
                } else {
                    module = Module.getModule(module);
                    $target = $(document);
                }
                base = [$(CONTEXT.target).attr('name')];
            } else
                module = Module.getModule(module);
            
            if (!Class.validate_name($('#add-class-modal input').val(), module.toString())){
                $('#add-class-modal .error').html('Illegal name or Class existing in current Module');
                return false;
            }

            $('#add-class-modal .error').html('');
            var klass = new Class(
                module,
                $('#add-class-modal input').val(),
                base?base:[],
            );
            var $node = $(
                `<template-class name='`+klass.toString()+`'></template-class>`
            );
            var col1 = Math.floor(Math.random()*6);
            var col2 = col1;
            while (col2==col1){
                col2 = Math.floor(Math.random()*6);
            }
            col1 = COLOR[col1];
            col2 = COLOR[col2];
            $node.data({
                'cssBoxShadow':
                '1px 1px 1px 0 rgba('+col1[0]+', '+col1[1]+', '+col1[2]+', 0.85), -1px -1px 1px 0 rgba('+col2[0]+', '+col2[1]+', '+col2[2]+', 0.85)',
                'cssBackground': `linear-gradient(135deg, rgba(`+col2[0]+`, `+col2[1]+`, `+col2[2]+`, 0.85) 0%, rgba(`+col1[0]+`, `+col1[1]+`, `+col1[2]+`, 0.85) 100%),
                linear-gradient(
                    135deg,
                    rgba(255, 255, 255, 0.2) 0%,
                    rgba(255, 255, 255, 0.6) 25%,
                    rgba(255, 255, 255, 0.2) 50%,
                    rgba(255, 255, 255, 0.6) 75%,
                    rgba(255, 255, 255, 0.2) 100%
                ) center`
            });
            if (module.toString() === 'main' || $target[0] == document){
                $node.insertBefore('.cm-main');
            } else {
                $target.append($node);
            }
            $node.offset({
                top: CONTEXT.clientY,
                left: CONTEXT.clientX
            });
            $node = render_class($node);
            render_docstring($node);
            $('#add-class-modal').modal('hide');
        } else{
            $('#add-class-modal .error').html('');
            $('#add-class-modal form')[0].reset()
            $('#add-class-modal').modal('show');
        }
    }
    function add_member(event){
        if (!event){
            set_unsaved(true);;
            var klass = Class.getClassFromName(
                $(CONTEXT.target).attr('name')
            );
            
            if (!Member.validate_name($('#add-member-modal input').val(), klass)){
                $('#add-member-modal .error').html('Illegal member name');
                return false;
            }

            $('#add-member-modal .error').html('');
            var member = new Member(
                $('#add-member-modal input[name=membername]').val(),
                klass,
                $('#add-member-modal input[name=type]').val(),
                $('#add-member-modal input[name=value]').val(),
                '',
                $('#add-member-modal select[name=access]').val(),
                $('#add-member-modal input[name=static]:checked').val()=='true',
                $('#add-member-modal input[name=property]:checked').val()=='true',
            );
            var $node = $(
                `<class-member name='`+member.toString()+`'></class-member>`
            );
            $(CONTEXT.target).find('.members').append($node);
            $node = render_member($node);
            render_docstring($node);
            register_node($node);
            $('#add-member-modal').modal('hide');
        } else{
            $('#add-member-modal .error').html('');
            $('#add-member-modal form')[0].reset()
            $('#add-member-modal').modal('show');
        }
    }
    function add_method(event){
        if (!event){
            set_unsaved(true);;
            var klass = Class.getClassFromName(
                $(CONTEXT.target).attr('name')
            );
            
            if (!Method.validate_name($('#add-method-modal input').val(), klass)){
                $('#add-method-modal .error').html('Illegal method name');
                return false;
            }

            $('#add-method-modal .error').html('');
            ret_type = $('#add-method-modal input[name=ret_type]').val();
            var method = new Method(
                $('#add-method-modal input[name=methodname]').val(),
                klass,
                $('.args-input').map((_, e)=>
                  [
                    [
                        $(e).find('.arg-type').val(),
                        $(e).find('.arg-name').val(),
                        $(e).find('.arg-value').val()?$(e).find('.arg-value').val():null
                    ]
                ]
                ).get(),
                ret_type?ret_type:null,
                '',
                $('#add-method-modal select[name=access]').val(),
                $('#add-method-modal input[name=static]:checked').val()=='true',
                $('#add-method-modal input[name=constructor]:checked').val()=='true',
            );
            var $node = $(
                `<class-method name='`+method.toString()+`'></class-method>`
            );
            $(CONTEXT.target).find('.methods').append($node);
            $node = render_method($node);
            render_docstring($node);
            register_node($node);
            $('#add-method-modal').modal('hide');
        } else{
            $('#add-method-modal .error').html('');
            $('#add-method-modal form')[0].reset()
            $('#add-method-modal form .args-input').remove();
            $('#add-method-modal').modal('show');
        }
    }
}
/** Delete Functions */{
    function delete_node(event){
        if (!event){
            set_unsaved(true);;
            $node = $(CONTEXT.target);
            if ($node.hasClass('member')){
                klass = Class.getClassFromName(
                    $node.parents('.class').attr('name')
                );
                member = klass.members.find(m=>m.toString()==$node.attr('name'));
                klass.members.splice(klass.members.indexOf(member), 1);
                $node.remove();
            }
            if ($node.hasClass('method')){
                klass = Class.getClassFromName(
                    $node.parents('.class').attr('name')
                );
                method = klass.methods.find(m=>m.toString()==$node.attr('name'));
                klass.methods.splice(klass.methods.indexOf(method), 1);
                var $sibling;
                if ($node.parent().hasClass('overloads')){
                    if ($node.siblings().length==1)
                        $sibling = $node.siblings();
                    else {
                        var $badge = $node.parent()
                            .siblings(
                                '.overloaded-method[name="'+$node.parent().attr('name')+'"]'
                            ).find('.badge');
                        $badge.text(Number($badge.text())-1);
                    }
                }
                $node.remove();
                if ($sibling){
                    $sibling
                        .parent()
                        .siblings(
                            '.overloaded-method[name="'+$sibling.parent().attr('name')+'"]'
                        ).remove();
                    $sibling.unwrap();
                }
            }
            if ($node.hasClass('class')){
                function _recursive_childclass_node_remove(cls){
                    cls.children.forEach(c=>{
                        if ($('.class[name="'+c+'"]').length){
                            _recursive_childclass_node_remove(
                                Class.getClassFromName(c)
                            );
                            $('.class[name="'+c+'"]').remove();
                        }
                    });
                }
                var klass = Class.getClassFromName($node.attr('name'));
                if ($('#delete-modal input[name=delete_children]').is(':checked')){
                    _recursive_childclass_node_remove(klass);
                    klass.delete(true);
                }
                else
                    klass.delete(false);
                $node.remove();
                $('#delete-modal').modal('hide');
            }
            if ($node.hasClass('module')){
                var module = Module.getModule($node.attr('name'));
                if($('#delete-modal input[name=delete_children]').is(':checked')){
                    module.delete(true);
                    $node.remove();
                } else {
                    function _rename_child_name_attr($child){
                        if (
                            $child.attr('name') != undefined &&
                            $child.attr('name').startsWith(old_name) &&
                            ($child.attr('name').indexOf('.')>=0 || $child.hasClass('module'))
                        ){
                            var name = new_name+$child.attr('name').slice(old_name.length);
                            $child.attr('name', name);
                        }
                        if ($child.hasClass('overloaded-method')){
                            var target = `.class[name="`+$child.parents('.class').attr('name')+`"]`+
                            ` .collapse[name=`+$child.attr('name')+`]`;

                            $child.attr('data-bs-target', target);
                        }
                        $child.children().each((_, child)=>_rename_child_name_attr($(child)));

                    }
                    var old_name = module.toString();
                    var new_name = module.parent.toString();
                    _rename_child_name_attr($node);
                    $node.children().filter(
                        (_, c) => $(c).hasClass('description')||$(c).hasClass('resizer')
                    ).remove();
                    var children_offsets = {};
                    $node.contents()
                      .filter((_, x)=>$(x).hasClass('module')||$(x).hasClass('class'))
                      .each((_,x)=>{children_offsets[$(x).attr('name')]=$(x).offset();});
                      $node.contents().unwrap()
                      .filter((_, x)=>$(x).hasClass('module')||$(x).hasClass('class'))
                      .each((_,x)=>{$(x).offset(children_offsets[$(x).attr('name')]);});
                    module.delete(false);
                }
                $('#delete-modal').modal('hide');
            }
        } else {
            $('#delete-modal .error').html('');
            $('#delete-modal form')[0].reset()
            if ($(CONTEXT.target).hasClass('member') || $(CONTEXT.target).hasClass('method'))
                delete_node();
            else
                $('#delete-modal').modal('show');
        }
    }
}

function modal_add_agrs_field($this){
    $this.before(
        `<div class="args-input">`+
            `<input class="form-control arg-name" name="argname" placeholder="Name" required />`+
            `<input class="form-control arg-type" name="argtype" placeholder="Type" />`+
            `<input class="form-control arg-value" name="argval" placeholder="Value" />`+
            `<button style="background: transparent; border: 0;" onclick="$(this).parent().remove()">`+
              `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" class="bi bi-trash3" viewBox="0 0 16 16">`+
                `<path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>`+
              `</svg>`+
            `</button>`+
        `</div>`
    );
}

function save(project_name=null){
    project_name = project_name || PROJECT;
    if (!project_name){
        $('#project-name-modal').modal('show');
        return;
    }
    function encode_docstring($node){
        return `<doc-string>${$node.text().trim()}</doc-string>`;
    }
    function encode_member($node){
        var docstring = encode_docstring($node.children('.description'));
        return `<class-member name='${$node.attr('name')}'>`+
            docstring+
        `</class-member>`;
    }
    function encode_method($node){
        var docstring = encode_docstring($node.children('.description'));
        return `<class-method name='${$node.attr('name')}'>`+
            docstring+
        `</class-method>`;
    }
    function encode_class($node){
        var members = [];
        var methods = [];
        var docstring = encode_docstring($node.children('.description'));
        $node.find('.member').each((_, member)=>{
            members.push(encode_member($(member)));
        });
        $node.find('.method').each((_, method)=>{
            methods.push(encode_method($(method)));
        });
        return `<template-class name='${$node.attr('name')}'`+
         ` data-height='${$node.height()}'`+
         ` data-width='${$node.width()}'`+
         ` data-obj-offset-left='${$node.offset().left}'`+
         ` data-obj-offset-top='${$node.offset().top}'`+
         ` data-css-top='${$node.css('top')}'`+
         ` data-css-bottom='${$node.css('bottom')}'`+
         ` data-css-right='${$node.css('right')}'`+
         ` data-css-left='${$node.css('left')}'`+
         ` data-css-box-shadow='${$node.css('box-shadow')}'`+
         ` data-css-background='${$node.css('background')}'`+
        `>`+
            members.join('')+
            methods.join('')+
            docstring+
        `</template-class>`;
    }
    function encode_module($node){
        var children = [];
        var docstring;
        $node.children().each((_, child)=>{
            if ($(child).hasClass('module'))
                children.push(encode_module($(child)));
            if ($(child).hasClass('class'))
                children.push(encode_class($(child)));
            if ($(child).hasClass('description'))
                docstring = encode_docstring($(child));
        });
        return `<template-module name='${$node.attr('name')}'`+
         ` data-height='${$node.height()}'`+
         ` data-width='${$node.width()}'`+
         ` data-obj-offset-left='${$node.offset().left}'`+
         ` data-obj-offset-top='${$node.offset().top}'`+
         ` data-css-top='${$node.css('top')}'`+
         ` data-css-bottom='${$node.css('bottom')}'`+
         ` data-css-right='${$node.css('right')}'`+
         ` data-css-left='${$node.css('left')}'`+
        `>`+
            children.join('')+
            docstring+
        `</template-module>`;
    }
    var children = [];
    $('body').children().each((_, child)=>{
        if ($(child).hasClass('module'))
            children.push(encode_module($(child)));
        if ($(child).hasClass('class'))
            children.push(encode_class($(child)));
    });
    url = URL.createObjectURL(
        new Blob(
            [btoa(
                JSON.stringify({
                    json: Module.Modules,
                    xml:`<main name='${project_name}'>`+
                        children.join('')+
                    `</main>`
                })
            )],
            {type: 'text'}
        )
    );
    $a = $(`<a href='${url}' download='${project_name}.cnvproj' style='display: none;'></a>`);
    $('body').append($a);
    $a[0].click();
    $a.remove();
    set_unsaved(false);
    $('title').text(`Canvas- ${project_name}`);
}

function load(data){
    Object.keys(Module.Modules).forEach(k=>{
        if (k!='main')
            delete Module.Modules[k];
    });
    $('.module').remove();
    $('.class').remove();
    if (!data){
        var file_selected = false;
        $input = $(`<input type='file' style='display: none;' />`);
        $('body').append($input);
        $input[0].click();
        $input.change(function(){
            file_selected = true;
            var file = this.files[0];
            if (!file.name.endsWith('.cnvproj')){
                showError(`Unreadable Project file <${file.name}>`);
                return;
            }
            var fr = new FileReader(file);
            fr.readAsBinaryString(file);
            fr.onload = () =>{load(JSON.parse(atob(fr.result)))};
            $(this).off('change');
            $(this).remove();
        });
        $(window).focus(function(){
            setTimeout(function(){
                if (!file_selected){
                    $input.remove();
                    $(window).off('focus');
                }
            }, 300);
        });
        return;
    }
    Module.getModule('main').load(data.json);
    $main = $(data.xml);
    PROJECT = $main.attr('name');
    $('title').text(`Canvas- ${PROJECT}`);
    
    $main = render_module($main);
    $main = render_class($main);
    $main = render_member($main);
    $main = render_method($main);
    render_docstring($main);
    $('.cm-main').before(
        $main.contents().unwrap()
    );
    register_node($main);
}

function showError(message, autohide=3000){
    $('#error-modal p').text(message);
    $('#error-modal').modal('show');
    if (autohide){
        setTimeout(function(){
            $('#error-modal').modal('hide');
        }, autohide);
    }
}