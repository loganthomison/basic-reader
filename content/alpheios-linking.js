/**
 * @fileoverview linking utility functions are encaspulated in the Alph.linking object
 * namespace. 
 * @version $Id: alpheios-linking.js 703 2008-06-04 22:43:02Z MichaelGursky $
 *   
 * Copyright 2008 Cantus Foundation
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
 
/**
 * @singleton
 */
Alph.linking = {

    io_service:  
            Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService),

    input_stream: 
            Components.classes["@mozilla.org/scriptableinputstream;1"]
            .getService(Components.interfaces.nsIScriptableInputStream),

    loaded_indices: {},
    
    /**
     * Lookup a target in an index file. This is just a placeholder
     * function until we figure out how we really want to handle
     * linking.
     * @param {String} a_link the string to lookup in the linking index file
     * @param {String} a_docid the id (Name) of the linking index file
     * @param {Alph.LanguageTool} the LanguageTool which is to be used to retrieve
     *                            the index file 
     */
    find_link_target: function(a_link,a_docid,a_lang_tool)
    {
        // load the index if we haven't already done so
        if (typeof this.loaded_indices[a_docid] == "undefined")
        {
            this.loaded_indices[a_docid] = {};
            try {
                var index_file_url = a_lang_tool.getIndexFile(a_docid);
                Alph.util.log("Reading index from file system: " + index_file_url);
                var channel = this.io_service.newChannel(index_file_url, null, null);
                var input = channel.open();
                this.input_stream.init(input);
                var buffer = this.input_stream.read(input.available());
                this.input_stream.close();
                input.close();
                
                var lines = buffer.split(/\r?\n/);
                lines.forEach(
                    function(a_e,a_i,a_lines)
                    {
                        var entry = a_e.split(/\|/);
                        if (entry.length == 2)
                        {
                            this.loaded_indices[a_docid][entry[0]] = entry[1];
                        }
                    }, this
                );
            } 
            catch(exception)
            {
                Alph.util.log(exception);
                return;
            }
    
        }
        return this.loaded_indices[a_docid][a_link];    
    }
};
