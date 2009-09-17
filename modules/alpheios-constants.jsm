/**
 * @fileoverview Defines miscellaneous constants for the Alpheios extensions.
 * This module exports a single symbol, Constants, which must be imported into 
 * the namespace of the importing class.
 *
 * @version $Id$
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
 
const EXPORTED_SYMBOLS = ['Constants'];

/**
 * @class Alpheios Application Constants
 */
Constants = {
    /**
     * Event types
     * @constant
     */
    EVENTS: 
        {
            SHOW_TRANS: 100,
            HIDE_POPUP: 200,
            REMOVE_POPUP: 300,
            SHOW_DICT: 400,
            UPDATE_PREF: 500,
            LOAD_DICT_WINDOW: 600,
            LOAD_TREE_WINDOW: 700,
            UPDATE_XLATE_TRIGGER: 800
        },

    /**
     * Levels (modes)
     * @constant
     */
    LEVELS: 
    {
        LEARNER: 'learner',
        READER: 'reader',
    },
    
};