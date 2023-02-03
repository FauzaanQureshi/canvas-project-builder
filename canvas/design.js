function default_dict(factory, origin) {
    let _dict = new Proxy({ ...origin }, {
        get(dict, key) {
            // Ensure that "missed" keys are set into
            // The dictionary with default values
            if (key=='hasOwnProperty'){
                return function(prop){return Object.hasOwnProperty.call(dict, prop)};
            }
            if (!dict.hasOwnProperty(key)) {
                dict[key] = factory();
            }

            return dict[key];
        }
    });
    return _dict;
}
helper = {
    /* this class is DEPENDENT on [these classes]*/
    dependent: default_dict(Array), /* { <mangled_classname (this class)>:[] , ... } */
    /* [That class] has [many DEPENDEEs including this class]*/
    dependee: default_dict(Array), /* { <mangled_classname>:[(this class)] , ... } */

    removeElement: function(array, value){
        if (array.indexOf(value)<0) return null;
        return array.splice(array.indexOf(value, 1));
    }
}

class Module{
    static Modules={};
    constructor(
        name,
        parent=null,
        description='',
        children=[],
        classes={},
    ){
        if (!Module.validate_name(name)){
            throw new Error('Illegal or Existing Module name <'+name+'>');
        }
        if (!parent && name!='main'){
            throw new Error('Module <'+name+'> must be a submodule of Module <main>');
        }
        if (typeof parent == 'string'){
            parent = Module.getModule(parent);
        }
        this.name = name;
        this.parent = parent;
        this.children = children;
        this.classes = classes;
        this.description = description;
        
        if (parent)
            parent.children.push(this.toString());
        Module.Modules[this.toString()] = this;
    }

    rename(new_name, parent_mangled_name='main'){
        Module.ensure_valid_object(this);
        if (this.toString() === parent_mangled_name+'_'+new_name) return;
        if (!Module.validate_name(new_name, parent_mangled_name)){
            throw new Error('Illegal or Existing Module name <'+new_name+'>');
        }
        let old_mangled_name = this.toString();
        let this_module = this;
        let new_module_name = parent_mangled_name+'_'+new_name;
        Object.keys(this.classes).forEach(classname => {
            this_module.classes[classname].bases.forEach(function(base, idx){
                if (base.startsWith(this_module.toString())){
                    this_module.classes[classname].bases[idx] = new_module_name +
                        base.substring(this_module.toString().length);
                }
            });
            this_module.classes[classname].children.forEach(function(child, idx){
                if (child.startsWith(this_module.toString())){
                    this_module.classes[classname].children[idx] = new_module_name +
                        child.substring(this_module.toString().length);
                }
            });
            this_module.classes[classname].dependencies.forEach(function(dependency, idx){
                if (dependency.startsWith(this_module.toString())){
                    this_module.classes[classname].dependencies[idx] = new_module_name +
                        dependency.substring(this_module.toString().length);
                }
            });
            this_module.classes[classname].module = new_module_name;
            this_module.classes[
                this_module.classes[classname].toString()
            ] = this_module.classes[classname];
            delete this_module.classes[classname];
        });

        Object.keys(helper.dependent).forEach(mangled_classname => {
            helper.dependent[mangled_classname].forEach(function(element, idx){
                if (element.startsWith(this_module.toString())){
                    helper.dependent[mangled_classname][idx] = new_module_name +
                        element.substring(
                            this_module.toString().length
                        );
                }
            });
            if (mangled_classname.startsWith(this_module.toString())){
                helper.dependent[
                    new_module_name +
                    mangled_classname.substring(this_module.toString().length)
                ] = helper.dependent[mangled_classname];
                delete helper.dependent[mangled_classname];
            }
        });

        Object.keys(helper.dependee).forEach(mangled_classname => {
            helper.dependee[mangled_classname].forEach(function(element, idx){
                if (element.startsWith(this_module.toString())){
                    helper.dependee[mangled_classname][idx] = new_module_name +
                        element.substring(
                            this_module.toString().length
                        );
                }
            });
            if (mangled_classname.startsWith(this_module.toString())){
                helper.dependee[
                    new_module_name +
                    mangled_classname.substring(this_module.toString().length)
                ] = helper.dependee[mangled_classname];
                delete helper.dependee[mangled_classname];
            }
        });

        this.name = new_name;
        this.parent = Module.getModule(parent_mangled_name);
        Module.Modules[this.toString()] = Module.Modules[old_mangled_name];
        delete Module.Modules[old_mangled_name];
        
        this.children.forEach((c, idx)=>{
            var child = Module.getModule(c);
            this.children[idx] = child.toString();
            Module.Modules[child.toString()] = Module.Modules[c];
            delete Module.Modules[c];
        });
    }
    delete(remove_children=true){
        Module.ensure_valid_object(this);
        if (remove_children || this.toString()=='main'){
            /* POSSIBLE BUG DUE TO SHALLOW COPY */
            Object.values(this.classes).forEach(cls => {
                cls.delete(remove_children);
            });
            [...this.children].forEach(element => {
                this.deleteSubModule(element, remove_children);
            });
        } else {
            /* Move all classes and children to parent Module.
             * Rename mangled names of following in order:
             * Class().bases
             * Class().children
             * Class().dependencies
             * Class().module
             * Module().classes
             * helper.dependent
             * helper.dependee
             */
            let this_module = this;
            let parent_module = Module.getModule(this_module.parent);
            Object.keys(this.classes).forEach(classname => {
                this_module.classes[classname].bases.forEach(function(base, idx){
                    if (base.startsWith(this_module.toString())){
                        this_module.classes[classname].bases[idx] = parent_module.toString() +
                            base.substring(this_module.toString().length);
                    }
                });
                this_module.classes[classname].children.forEach(function(child, idx){
                    if (child.startsWith(this_module.toString())){
                        this_module.classes[classname].children[idx] = parent_module.toString() +
                            child.substring(this_module.toString().length);
                    }
                });
                this_module.classes[classname].dependencies.forEach(function(dependency, idx){
                    if (dependency.startsWith(this_module.toString())){
                        this_module.classes[classname].dependencies[idx] = parent_module.toString() +
                            dependency.substring(this_module.toString().length);
                    }
                });
                this_module.classes[classname].module = parent_module.toString();

                parent_module.classes[
                    this_module.classes[classname].toString()
                ] = this_module.classes[classname]
                delete this.classes[classname];
            });
            
            Object.keys(helper.dependent).forEach(mangled_classname => {
                helper.dependent[mangled_classname].forEach(function(element, idx){
                    if (element.startsWith(this_module.toString())){
                        helper.dependent[mangled_classname][idx] = parent_module.toString() +
                            element.substring(
                                this_module.toString().length
                            );
                    }
                });
                if (mangled_classname.startsWith(this_module.toString())){
                    helper.dependent[
                        parent_module.toString() +
                        mangled_classname.substring(this_module.toString().length)
                    ] = helper.dependent[mangled_classname];
                    delete helper.dependent[mangled_classname];
                }
            });

            Object.keys(helper.dependee).forEach(mangled_classname => {
                helper.dependee[mangled_classname].forEach(function(element, idx){
                    if (element.startsWith(this_module.toString())){
                        helper.dependee[mangled_classname][idx] = parent_module.toString() +
                            element.substring(
                                this_module.toString().length
                            );
                    }
                });
                if (mangled_classname.startsWith(this_module.toString())){
                    helper.dependee[
                        parent_module.toString() +
                        mangled_classname.substring(this_module.toString().length)
                    ] = helper.dependee[mangled_classname];
                    delete helper.dependee[mangled_classname];
                }
            });
        }
        if (this.parent){
            helper.removeElement(
                Module.getModule(this.parent).children,
                this.toString(),
            );
        }
        delete Module.Modules[this.toString()];
        parent = this.parent.toString();
        [...this.children].forEach((c, idx)=>{
            var child = Module.getModule(c);
            child.rename(child.name, parent);
            this.children[idx] = child.toString();
        });
        this.parent.children.push(...this.children);
        delete this.children;
        this.parent = null;
    }
    load(data){
        /** Create Classes */
        data[this.toString()].classes.forEach(cls=>{
            var klass = new Class(
                this,
                cls.class,
                cls.bases,
                cls.description,
            );
            /** Create Members */
            cls.members.forEach(member=>{
                new Member(
                    member.member,
                    klass,
                    member.type,
                    member.value,
                    member.description,
                    member.access,
                    member.is_static,
                    member.is_property
                );
            });
            /** Create Methods */
            cls.methods.forEach(method=>{
                new Method(
                    method.method,
                    klass,
                    []/*args*/,
                    method.returns,
                    method.description,
                    method.access,
                    method.is_static,
                    method.is_constructor,
                );
            });
        });

        /** Create Submodules */
        data[this.toString()].submodules.forEach(child=>{
            new Module(
                data[child].module,
                this,
                data[child].description,
            ).load(data);
        });
    }
    save(){}
    build(){}

    addSubModule(name){
        Module.ensure_valid_object(this);
        let sub = new Module(name, this.toString());
        this.children.push(sub.toString());
    }
    deleteSubModule(mangled_name, remove_children=true){
        Module.ensure_valid_object(this);
        if(this.children.indexOf(mangled_name)<0){
            console.warn('Module <'+mangled_name+'> does not exist');
        }
        else{
            Module.getModule(mangled_name).delete(remove_children);
        }
    }

    addClass(cls){
        Module.ensure_valid_object(this);
        this.classes[cls.toString()] = cls;
    }
    deleteClass(cls){
        Module.ensure_valid_object(this);
        if (Class.exists(cls.name, this.toString())){
            return delete this.classes[cls.toString()];
        } 
    }
    getClass(classname){
        Module.ensure_valid_object(this);
        if (!this.classes.hasOwnProperty(this.toString()+'.'+classname)){
            throw new Error(
                'Class <'+classname+
                '> does not exist in Module <'+this.name+'>'
            );
        }
        return this.classes[this.toString()+'.'+classname];
    }

    onContext(){}

    static validate_name(name, parent_mangled_name='') {
        return (
            /^[A-Za-z]+[A-Za-z0-9]*$/.test(name) &&
            !Module.exists(parent_mangled_name+'_'+name)
        );
    }
    static exists(mangled_name){
        return Module.Modules.hasOwnProperty(mangled_name);
    }
    static getModule(mangled_name){
        if (!Module.exists(mangled_name)){
            throw new Error(
                'Module<'+mangled_name+'> does not exist'
            );
        }
        return Module.Modules[mangled_name];
    }
    static ensure_valid_object(module, warn_only=false){
        if (module.parent===null && module.name!='main'){
            if (warn_only)
                console.warn('Module <'+module.name+'> has been deleted. Use delete <reference> to remove the stale reference');
            else
                throw new Error('Module <'+module.name+'> has been deleted. Use delete <reference> to remove the stale reference');
        }
        if (module.parent!=null && module.name==='main'){
            if (warn_only)
                console.warn('Module <main> is corrupted');
            else
                throw new Error('Module <main> is corrupted');
        }
    }
    toString(){
        Module.ensure_valid_object(this);
        if (this.parent === null){
            return this.name;
        }
        return this.parent.toString()+'_'+this.name;
    }
    toJSON(){
        Module.ensure_valid_object(this);
        let dict = {
            module: this.name,
            parent: ''+this.parent,
            description: this.description,
            submodules: this.children,
            classes: Object.values(this.classes),
        };
        return dict;
    }
}
new Module('main');

class Class{
    constructor(
        module,             /* <ModuleObject> */
        name,
        parents=[],         /* Array[mangled classname, ...]    */
        description='',
        dependencies=[],    /* Array[mangled classname , ...]   */
        methods=[],         /* Array[<MethodObject>, ...]   */
        members=[],         /* Array[<MemberObject>, ...]   */
    ){
        if (!Class.validate_name(name, module.toString())){
            throw new Error(
                'Illegal or Existing Class name <'+module+'.'+name+'>'
            );
        }
        this.name = name;
        this.module = module.toString();
        this.description = description;
        this.children = [];
        
        this.bases = [];
        parents.forEach(element => {
            this.addBase(element);
        });

        this.dependencies = [];
        dependencies.forEach(element => {
            this.addDependency(element);
        });
        
        this.methods = methods;
        this.members = members;

        module.addClass(this);
    }

    addBase(mangled_classname){
        if (Class.exists(mangled_classname)){
            Class.getClassFromName(mangled_classname).children.push(
                this.toString()
            );
        }
        this.bases.push(mangled_classname);
    }
    deleteBase(mangled_classname){
        if (this.bases.indexOf(mangled_classname)<0){
            console.warn(this.toString()+' has no Super class '+mangled_classname);
        } else {
            if (Class.exists(mangled_classname)){
                helper.removeElement(
                    Class.getClassFromName(mangled_classname).children,
                    this.toString()
                );
            }
            helper.removeElement(
                this.bases,
                mangled_classname
            );
        }
    }

    addDependency(mangled_classname){
        if (Class.exists(mangled_classname)){
            helper.dependent[this.toString()].push(mangled_classname);
            helper.dependee[mangled_classname].push(this.toString());
        }
        this.dependencies.push(mangled_classname);
    }
    deleteDependency(mangled_classname){
        if (this.dependencies.indexOf(mangled_classname)<0){
            console.warn(this.toString()+' has no dependency '+mangled_classname);
        } else {
            if (Class.exists(mangled_classname)){
                helper.removeElement(
                    helper.dependent[this.toString()],
                    mangled_classname
                );
                helper.removeElement(
                    helper.dependee[mangled_classname],
                    this.toString()
                );
            }
            helper.removeElement(this.dependencies, mangled_classname);
        }
    }

    change_module(new_modulename){
        if (!Module.exists(new_modulename)){
            throw new Error(
                'Module <'+new_modulename+'> does not exist.'
            );
        } else{
            this.rename(this.name, new_modulename);
        }
    }
    rename(new_name, new_modulename=null){
        if (!(Class.validate_name(new_name, this.module) || new_modulename)){
            throw new Error(
                'Illegal or Existing Class name <'+this.module+'.'+new_name+'>'
            );
        }
        if (!new_modulename)
            new_modulename = this.module;

        let old_name = this.toString();
        new_name = new_modulename + '.' + new_name;

        this.bases.forEach(base_classname => {
            let base = Class.getClassFromName(base_classname);
            base.children[
                base.children.indexOf(old_name)
            ] = new_name;
            
        });
        this.children.forEach(child_classname => {
            let child = Class.getClassFromName(child_classname);
            child.bases[
                child.bases.indexOf(old_name)
            ] = new_name;
            
        });

        if (new_modulename==this.module){
            Module.getModule(this.module)
                .classes[new_name] = Module.getModule(this.module).classes[old_name]
            delete Module.getModule(this.module).classes[old_name]
        } else{
            Module.getModule(new_modulename)
                .classes[new_name] = Module.getModule(this.module).classes[old_name]
            delete Module.getModule(this.module).classes[old_name]
            this.module = new_modulename;
        }

        if (helper.dependent.hasOwnProperty(old_name)){
            helper.dependent[old_name].forEach(depends_on => {
                let idx = helper.dependee[depends_on].indexOf(old_name);
                if (idx >= 0)
                    helper.dependee[depends_on][idx] = new_name;
            });
            helper.dependent[new_name] = helper.dependent[old_name];
            delete helper.dependent[old_name];
        }
        if (helper.dependee.hasOwnProperty(old_name)){
            helper.dependee[old_name].forEach(is_dependent_on => {
                let idx = helper.dependent[is_dependent_on].indexOf(old_name);
                if (idx >= 0)
                    helper.dependent[is_dependent_on][idx] = new_name;
            });
            helper.dependee[new_name] = helper.dependee[old_name];
            delete helper.dependee[old_name];
        }
    }
    delete(remove_children=true){
        if (remove_children){
            [...this.children].forEach(subclassname => {
                Class.getClassFromName(subclassname).delete(remove_children);
            });
        } else{
            [...this.children].forEach(subclassname => {
                Class.getClassFromName(subclassname).deleteBase(this.toString());
            });
        }
        [...this.methods].forEach((_, idx) => {
            this.methods.splice(idx, 1); 
        });
        [...this.members].forEach((_, idx) => {
            this.members.splice(idx, 1); 
        });
        [...this.dependencies].forEach(element => {
            this.deleteDependency(element);
        });
        [...this.bases].forEach(element => {
            this.deleteBase(element);
        });

        if (helper.dependent.hasOwnProperty(this.toString())){
            delete helper.dependent[this.toString()];
        }
        if (helper.dependee.hasOwnProperty(this.toString())){
            delete helper.dependee[this.toString()];
        }

        Module.getModule(this.module).deleteClass(this);
        return this;
    }
    load(){}
    save(){}
    build(){}

    onContext(){}
    onHover(){}
    onSelect(){}
    onFlip(){}

    static validate_name(classname, modulename) {
        return (
            /^[A-Za-z_]+[A-Za-z0-9_]*$/.test(classname) &&
            !Class.exists(classname, modulename)
        );
    }
    static getClass(classname, modulename){
        return Module.getModule(modulename).getClass(classname);
    }
    static getClassFromName(mangled_name){
        let modulename = mangled_name.substring(0, mangled_name.indexOf('.'));
        let classname = mangled_name.substring(mangled_name.indexOf('.')+1);
        return Class.getClass(classname, modulename);
    }
    static exists(...args){ /* exists(mangled_classname) | exists(classname, modulename) */
        let classname, modulename;
        if (args.length<1 || args.length>2){
            throw new Error(
                'Class.exists expects: exists(mangled_classname) | exists(classname, modulename)'
            );
        }
        if (args.length==1){
            modulename = args[0].substring(0, args[0].indexOf('.'));
            classname = args[0].substring(args[0].indexOf('.')+1);
        } else {
            classname = args[0];
            modulename = args[1];
        }
        return Module.getModule(modulename).classes.hasOwnProperty(modulename+'.'+classname);
    }

    toString(){
        return this.module.toString()+'.'+this.name;
    }
    toJSON(){
        let dict = {
            'class':this.name,
            'module':this.module,
            'description':this.description,
            'bases': this.bases,
            'subclasses': this.children,
            'members': this.members,
            'methods': this.methods,
            'dependency': this.dependencies,
        };
        return dict;
    }

}

class Method{
    constructor(
        name,
        cls,
        args=[],            /* Array[<type>, <arg_name>, <default_val=null>]*/
        return_type=null,   /* void in C++, None in Python */
        description='',
        access='public',
        is_static=false,
        is_constructor=false,
    ){
        if (!Method.validate_name(name)){
            throw new Error('Illegal Method name: '+name);
        }
        if (!Class.exists(cls.toString())){
            throw new Error(
                cls.toString()+'> does not exist.'
            );
        }
        this.class = cls;
        this.name = name;
        this.args = args;
        this.return_type = return_type;
        this.access_attr = access;
        this.is_static = is_static;
        this.is_constructor = is_constructor;
        this.description = description;

        Class.getClassFromName(cls.toString()).methods.push(this);
    }

    static validate_name(name){
        return /^[A-Za-z_]+[A-Za-z0-9_]*$/.test(name);
    }

    toString(){
        let argstr = [];
        if (this.args.length>0){
            this.args.forEach(element => {
                let a_type, a_name, a_val;
                let temp = '';
                a_type= element[0];
                a_name= element[1];
                a_val = element[2];
                temp += a_name;
                if (a_type)
                    temp += ':'+a_type;
                if (a_val)
                    temp += '='+a_val;
                argstr.push(temp);
            });
        }
        return (
            this.class.toString() +
            '::' +this.name +
            '('+argstr.join(', ')+')' +
            (this.is_constructor?'':(' -> '+(this.return_type?this.return_type:'None')))
        );
    }
    toJSON(){
        let args = [];
        let a_type, a_name, a_val;
        this.args.forEach(element => {
            [a_type, a_name, a_val] = element;
            let a_dict = {};
            a_dict[a_name] = {type:a_type};
            if (a_val)
                a_dict[a_name]['default'] = a_val;
            args.push(a_dict);
        });
        let dict = {
            method: this.name,
            args: args,
            returns: this.return_type,
            access: this.access,
            is_static: this.is_static,
            is_constructor: this.is_constructor,
            description: this.description,
        };
        return dict;
    }
}

class Member{
    constructor(
        name,
        cls,
        type=null,      /* void* in C++, Any in Python */
        value=null,     /* None in Python */
        description='',
        access='public',
        is_static=false,
        is_property=false,
    ){
        if (!Member.validate_name(name, cls)){
            throw new Error('Illegal Member name: '+name);
        }
        if (!Class.exists(cls.toString())){
            throw new Error(
                cls.toString()+'> does not exist'
            );
        }
        this.class = cls;
        this.name = name;
        this.type = type;
        this.value = value;
        this.access = access;
        this.is_static = is_static;
        this.is_property = is_property;
        this.description = description;

        Class.getClassFromName(cls.toString()).members.push(this);
    }

    static validate_name(name, cls){
        return (
            /^[A-Za-z_]+[A-Za-z0-9_]*$/.test(name) &&
            cls.members.filter(m => {
                m.name==name
            }).length == 0
        )
    }

    toString(){
        let argstr = '';
        if (this.type)
            argstr = '<'+this.type;
        else
            argstr = '<Any';
        if (this.value)
            argstr += '='+this.value+'>';
        else
            argstr += '>';
        return this.class.toString()+'::'+this.name+argstr;
    }
    toJSON(){
        return {
            member: this.name,
            type: this.type,
            value: this.value,
            access: this.access,
            is_static: this.is_static,
            is_property: this.is_property,
            description: this.description,
        };
    }
}

function test(){
    main = Module.getModule('main');
    cls_a = new Class(main, 'A');

    mod_2 = new Module('mod2', main);
    cls_b = new Class(mod_2, 'B');
    
    init_b = new Method('B', cls_b, [['int', 'id', '0'], ['str', 'name']]);
    console.log(init_b.toString());
    mod_2.delete(false);
    // delete mod_2;
    console.log(init_b.toString());

    mod_3 = new Module('mod3', main);
    cls_c = new Class(mod_3, 'C', [cls_b.toString()]);

    cls_a.addDependency(cls_c.toString());
    console.log(cls_a.dependencies);
    console.log(cls_c.bases);
    console.log(cls_b.children);

    console.log(helper.dependent);
    console.log(helper.dependee);
}