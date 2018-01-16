(function() {

    const Cc = Components.classes;
    const Ci = Components.interfaces;
    const unicodeConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

    const __controller__ = {

        name: 'EasycardSettings',
        _scriptPath: '/data/profile/extensions/easycard_payment@vivicloud.net/chrome/content/easycard/',

        // initial SyncSettings
        initial: function(warn) {
            let settings = this.readSettings();
            let iniObject = this.parseINIString(GREUtils.File.readAllBytes(this._scriptPath+'icer_ftp.ini').toString());
            if (settings == null) {
                settings = {};
            }
            if (iniObject.ftp.ftp_username != "") {
                settings.ftp_username = iniObject.ftp.ftp_username;
            }
            if (iniObject.ftp.ftp_password != "") {
                settings.ftp_password = iniObject.ftp.ftp_password;
            }
            this.Form.unserializeFromObject('settingForm', settings);
        },

        readSettings: function() {
            let settings = {};
            settings = GeckoJS.Configure.read('vivipos.fec.settings.easycard_payment');
            return settings;
        },

        writeSettings: function(settings) {
            if (!settings) return false;
            GeckoJS.Configure.write('vivipos.fec.settings.easycard_payment', settings);

            try {
                //update ICERINI.xml
                let actions = {
                    'comport': 'setcomport',
                    'sp_id': 'setspid',
                    'location_id': 'setlocationid',
                    'cmas_port': 'setcmasport',
                };
                for (let settingKey in settings) {
                    if (-1 != GeckoJS.Array.inArray(settingKey, GeckoJS.BaseObject.getKeys(actions))) {
                        let action = actions[settingKey];
                        let settingValue = settings[settingKey];
                        GREUtils.File.run('/bin/bash', ['-c', '/usr/bin/timeout 5s ' + this._scriptPath + 'set_icerini.sh' + ' ' + action + ' ' + settingValue], true);
                    }
                }
                //update ftp ini
                let commands = 'cd '+this._scriptPath+'; ';
                for (let settingKey in settings) {
                    let settingValue = settings[settingKey].replace(/[/]/g, '\\/');
                    commands += 'sed -i -r "s/^'+settingKey+'=.*/'+settingKey+'='+settingValue+'/" icer_ftp.ini; ';
                }
                GREUtils.File.run('/bin/sh', ['-c', commands ], true);
            } catch(e) {
                this.log('ERROR', e);
            }

            return true;
        },

        parseINIString: function(data) {
            let regex = {
                section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
                param: /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/,
                comment: /^\s*;.*$/
            };
            let value = {};
            let lines = data.split(/\r\n|\r|\n/);
            let section = null;

            for(x=0;x<lines.length;x++)
            {

                if (regex.comment.test(lines[x])) {
                    return;
                } else if(regex.param.test(lines[x])) {
                    var match = lines[x].match(regex.param);
                    if(section){
                        value[section][match[1]] = match[2];
                    }else{
                        value[match[1]] = match[2];
                    }
                } else if(regex.section.test(lines[x])) {
                    var match = lines[x].match(regex.section);
                    value[match[1]] = {};
                    section = match[1];
                } else if(lines.length === 0 && section){
                    section = null;
                };

            }

            return value;
        },

        isAlphaNumeric: function(str) {
            let nonalphaRE = /[^a-zA-Z0-9]/;
            return !nonalphaRE.test(str);
        },

        validateForm: function(data) {
            let obj = this.Form.serializeToObject('settingForm', false);
            data.changed = this.Form.isFormModified('settingForm');
        },

        save: function() {
            let data = {
                cancel: false,
                changed: false
            };

            $do('validateForm', data, 'EasycardSettings');

            if (data.changed) {
                let topwin = GREUtils.XPCOM.getUsefulService("window-mediator").getMostRecentWindow(null);
                if (GREUtils.Dialog.confirm(topwin, _('setting_confirm'),
                        _('Are you sure you want to save the changes?')
                    )) {

                    try {
                        this.update();
                    } catch (e) {
                        this.log('WARN', 'Error saving settings to preferences.', e);
                    } finally {
                        GeckoJS.Observer.notify(null, 'prepare-to-restart', this);
                    }

                    return true;
                } else {
                    return false;
                }
            } else {
                NotifyUtils.warn(_('Sorry, your changes could not be saved'));
            }

            return !data.cancel;
        },


        update: function() {
            let obj = this.Form.serializeToObject('settingForm', false);
            this.Form.unserializeFromObject('settingForm', obj);
            let result = this.writeSettings(obj);
            if (result) {
                OsdUtils.info(_('Your changes have been saved'));
            } else {
                NotifyUtils.warn(_('Sorry, your changes could not be saved'));
            }
        },

        exit: function() {
            if (this.Form.isFormModified('settingForm')) {
                let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
                let check = {
                    data: false
                };
                let flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
                    prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL +
                    prompts.BUTTON_POS_2 * prompts.BUTTON_TITLE_IS_STRING;

                let action = prompts.confirmEx(this.topmostWindow,
                    _('Setting Confirmation'),
                    _('Save your changes before exit?'),
                    flags, _('Save'), '', _('Discard'), null, check);
                if (action == 1) {
                    return;
                } else if (action == 0) {
                    if (!this.save()) return;
                }
            }
            window.close();
        }


    };

    GeckoJS.Controller.extend(__controller__);

})();