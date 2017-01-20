(function() {

    const Cc = Components.classes;
    const Ci = Components.interfaces;
    const unicodeConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

    const __controller__ = {

        name: 'Settings',
        _scriptPath: "/data/profile/extensions/easycard_payment@vivicloud.net/chrome/content/easycard/",
        _settingFile: "setting.ini",

        // initial SyncSettings
        initial: function(warn) {
            let settings = this.readSettings();
            if (settings == null) {
                settings = {};
            }
            this.Form.unserializeFromObject('settingForm', settings);
        },

        readSettings: function() {
            let settings = {};
            settings = GeckoJS.Configure.read('vivipos.fec.settings.easycard_payment');
            return settings;
        },


        writeSettings: function(setting) {
            if (!setting) return false;
            GeckoJS.Configure.write('vivipos.fec.settings.easycard_payment', setting);

            let writeSettingFile = new GeckoJS.File(this._scriptPath + this._settingFile, true);
            settingParams = setting.comport;
            writeSettingFile.open("vivi");
            writeSettingFile.write(settingParams);
            writeSettingFile.close();

            return true;
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

            $do('validateForm', data, 'Settings');

            if (data.changed) {
                let topwin = GREUtils.XPCOM.getUsefulService("window-mediator").getMostRecentWindow(null);
                if (GREUtils.Dialog.confirm(topwin, _('setting_confirm'),
                        _('setting_confirm_str')
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
                NotifyUtils.warn(_('setting_not_saved'));
            }

            return !data.cancel;
        },


        update: function() {
            let obj = this.Form.serializeToObject('settingForm', false);
            this.Form.unserializeFromObject('settingForm', obj);
            let result = this.writeSettings(obj);
            if (result) {
                OsdUtils.info(_('setting_saved'));
            } else {
                NotifyUtils.warn(_('setting_not_saved'));
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
                    _('setting_exit'),
                    _('setting_exit_ask'),
                    flags, _('setting_save'), '', _('setting_descard'), null, check);
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

    window.addEventListener('load', function() {
        $do('initial', null, 'Settings');
    }, false);



})();