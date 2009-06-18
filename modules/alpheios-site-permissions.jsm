/**
 * @fileoverview This module is used for storing Alpheios permissions for specific sites
 * The interface is based on that of nsIPermissionManager but the implementation supports
 * paths as well as domains
 * @version $Id: $
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

/**
 * This module exports a single symbol, PermissionMgr.
 * This object should be imported into the namespace of the importing class
 */
var EXPORTED_SYMBOLS = ["PermissionMgr"];

/**
 * @singleton
 */
PermissionMgr =
{
    /**
     * URI is not registered for the requested permission
     * @type int 0
     */
    UNKNOWN_ACTION: 0,
    
    /**
     * Action is allowed
     * @type int
     *  
     */
    ALLOW_ACTION: 1,
    
    /**
     * Action is not allowed
     * @type int 0
     */
    DENY_ACTION: 2,
    
    /**
     * the array of sites and permissions
     */
    m_sites: Array(),
    
    /**
     * add or change a permission for a specific uri
     * @param {nsIURI} a_uri the uri object
     * @param {String} a_key key for the permission set
     * @param {int} a_permission one of UNKNOWN_ACTION, ALLOW_ACTION, DENY_ACTION
     */
    add: function(a_uri,a_key,a_permission)
    {
        // get domain
        var host = a_uri.host;
        var path = a_uri.path;
        if (!path || path == '')
        {
            path = '/';
        }
        if (typeof this.m_sites[a_key] == "undefined")
        {
            this.m_sites[a_key] = Array();
        }
        if (typeof this.m_sites[a_key][host] == "undefined")
        {
            this.m_sites[a_key][host] = [];
        }
        var found = false;
        for (var i=0; i<this.m_sites[a_key][host].length; i++)
        {
            var r_path = this.m_sites[a_key][host][i];
            if (r_path[0] == path)
            {
                // if the url was already registered, update the permission
                r_path[1] = a_permission;
                found = true;
            }
        }
        // if the url was not found, add it
        if (! found)
        {
          this.m_sites[a_key][host].push([path,a_permission]);
        }
    },
    
    /**
     * test for the requested action for a specific uri
     * @param {nsIURI} a_uri the uri object
     * @param {String} a_key key for the permission set
     * @return the permission if one is registered for this uri
     *         one of UNKNOWN_ACTION, ALLOW_ACTION, DENY_ACTION
     * @type int
     */
    testPermission: function(a_uri,a_key)
    {
        var host = a_uri.host;
        var path = a_uri.path;
        if (!path || path == '')
        {
            path = '/';
        }
        var permission = this.UNKNOWN_ACTION;
        if (typeof this.m_sites[a_key] != "undefined" && typeof this.m_sites[a_key][host] != "undefined")
        {
            for (var i=0; i<this.m_sites[a_key][host].length; i++)
            {
                var r_path_obj = this.m_sites[a_key][host][i];
                var regex = new RegExp('^'+r_path_obj[0])
                if (regex.exec(path))
                {
                    permission = r_path_obj[1];
                    break;
                }
            }
        }
        return permission;
    },
    
    /**
     * remove all the permissions for a domain
     * @param {String} a_host the domain
     * @param {String} a_key the key for the permission set
     */
    remove: function(a_host,a_key)
    {
        if (typeof this.m_sites[a_key] != "undefined" 
            && typeof this.m_sites[a_key][a_host] != "undefined")
        {
            delete this.m_sites[a_key][a_host];
        }
    }
}
