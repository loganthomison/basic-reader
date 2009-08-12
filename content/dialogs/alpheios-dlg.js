/**
 * @fileoverview About dialog funcitons
 * @version $Id: alpheios-about.js 746 2009-02-06 15:20:09Z BridgetAlmas $
 *   
 * Copyright 2008-2009 Cantus Foundation
 * http://alpheios.net
 * 
 * This file is part of Alpheios.
 * 
 * Alpheios is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Alpheios is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
 
Alph.Dialogs = 
{
     loadAbout: function()
     {
        // populate the Alpheios site link
        Alph.$("#alpheios-site-link").attr("value",Alph.Util.ALPHEIOS_URLS.main);
        
        // add the Alpheios version information
        var pkgs = Alph.MozUtils.getAlpheiosPackages();
        pkgs.forEach(
            function(a_item)
            {
                var box = Alph.Util.makeXUL('hbox',[],[]);
                var name = Alph.Util.makeXUL('label',null,['crop'],['right']);               
                Alph.$(name).text(a_item.name);
                var version = Alph.Util.makeXUL('description',null,[],[]);
                Alph.$(version).text(a_item.version);
                Alph.$(box).append(name);
                Alph.$(box).append(version);
                Alph.$("#alpheios-extension-list").append(box);
            }
        );
    },
    
    loadLeavingSite: function()
    {
        // add the survey link if there is one
        var survey = '';
        try 
        {   
            survey = Alph.MozUtils.getPref('survey.url');
        }
        catch(a_e)
        {
            survey = null;
        }
        if (survey && survey != '')
        {
            Alph.$("#survey-link").click(
                function()
                {
                    window.opener.gBrowser.selectedTab = window.opener.gBrowser.addTab(survey);
                }
            ).attr("hidden",false);            
                
        }
        // set the focus on the ok button
        Alph.$('#alpheios-leaving-dialog').get(0).getButton('accept').focus()
    }
 };
 