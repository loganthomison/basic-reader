/**
 * @fileoverview Defines the language containers for the melampus extension.
 *
 * @version $Id$
 * 
 * Copyright 2008 Cantus Foundation
 * http://alpheios.net
 * 
 * This file is part of Melampus.
 * 
 * Melampus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Melampus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
 
/**
 * The MP.Languages object holds
 * the instantiated instances of the {@link MP.LanguageTool}
 * objects for each supported language.
 * It is populated by {@link MP.main#set_languages}
 * @type Object
 */
MP.Languages = 
{
}

if ( typeof MP.LanguageToolSet == "undefined") 
{
    /**
     * The MP.LanguageToolSet object holds
     * language-specific prototypes derived from the 
     * base {@link MP.LanguageTool} class.
     * It is populated by code in the external  
     * language-specific extensions, which are dependent upon Melampus
     * @type Object 
     */
    MP.LanguageToolSet = {};
}

