/**
 * @fileoverview This file defines the MP.SourceSelection class prototype.
 *
 * @version $Id $
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
 * @class  MP.SourceSelection defines the properties of the target of the 
 * user's selection in the source text, as identified by the 
 * {@link MP.LanguageTool#findSelection} method.
 *  
 * @constructor 
 * @param {Properties} a_properties additional properties to set as private members of 
 *                                  the object (accessor methods will be dynamically created)
 */
MP.SourceSelection = function(a_properties) 
{
     this.set_accessors(a_properties);
};
 
/**
 * Creates accessor methods on the instance for the 
 * supplied properties object
 * @private
 * @param {Properties} a_properties properties for which to set accessors
 *                      if a property value is a function, this 
 *                      function will be called and its value returned
 *                      by the get accessor, otherwise,the value will 
 *                      be returned as-is 
 */
MP.SourceSelection.prototype.set_accessors = function(a_properties) 
{
        var myobj = this;
        for ( var prop in a_properties ) 
        { 
            ( function()
              {
                       var myprop = prop;
                       myobj[ "get"+ myprop ] = function() 
                       {
                           if (typeof a_properties[myprop] == 'function')
                           {
                                return a_properties[myprop]();
                           }
                           else
                           {
                                return a_properties[myprop];
                           }
                       };
                 
                       myobj[ "set" + myprop ] = function(val) 
                      {
                          a_properties[myprop] = val;
                      };
               
              }
            )();
        }
};


/**
 * source 'word'
 * @private
 * @type String 
 */
MP.SourceSelection.prototype.m_word = '';

/**
 * the offset in the original string which represents the
 * start of the word
 * @private
 * @type int
 */
MP.SourceSelection.prototype.m_wordStart = 0;

/**
 * the offset in the original string which represents the
 * end of the word
 * @private
 * @type int
 */
MP.SourceSelection.prototype.m_wordEnd = 0;

/**
 * optional relevant surrounding context
 * @private
 * @type String
 */
MP.SourceSelection.prototype.m_contextStr = '';

/**
 * position of the word in the surrounding context
 * @private
 * @type int  
 */
MP.SourceSelection.prototype.m_contextPos = 0;

/**
 * rangeParent node for the selection
 * @private
 * @type Node 
 */
MP.SourceSelection.prototype.m_rangeParent;

/**
 * gets the selected 'word'
 * @return the word
 * @type String
 */
MP.SourceSelection.prototype.getWord = function()
{
    return this.m_word;   
};

/**
 * get the offset in the original string which represents 
 * the selected word starting position
 * @return the word starting position
 * @type int 
 */
MP.SourceSelection.prototype.getWordStart = function()
{
    return this.m_wordStart
};

/**
 * get the offset in the original string which represents 
 * the selected word ending position
 * @return the word ending position
 * @type int 
 */
MP.SourceSelection.prototype.getWordEnd = function()
{
    return this.m_wordEnd
};

/**
 * get the surrounding context 
 * @return the surrounding context
 * @type String
 */
MP.SourceSelection.prototype.getContext = function()
{
    return this.m_contextStr;
};

/**
 * get the offset of the selected word in  
 * the surrounding context
 * @return the word offset
 * @type int 
 */
MP.SourceSelection.prototype.getContextPos = function()
{
    return this.m_contextPos;
};

/**
 * get the rangeParent of the selection
 * @return the range parent
 * @type Node 
 */
MP.SourceSelection.prototype.getRangeParent = function(a_parent)
{
    return this.m_rangeParent;
};

/**
 * sets the selected 'word'
 * @param {String} a_word the word
 */
MP.SourceSelection.prototype.setWord = function(a_word)
{
    this.m_word = a_word;   
};

/**
 * set the offset in the original string which represents 
 * the selected word starting position
 * @param {int} a_pos the word starting position
 */
MP.SourceSelection.prototype.setWordStart = function(a_pos)
{
    this.m_wordStart = a_pos;
};

/**
 * set the offset in the original string which represents 
 * the selected word ending position
 * @param {int} a_pos the word ending position
 */
MP.SourceSelection.prototype.setWordEnd = function(a_pos)
{
    this.m_wordEnd = a_pos;
};

/**
 * set the surrounding context 
 * @param {String} a_context the surrounding context
 */
MP.SourceSelection.prototype.setContext = function(a_context)
{
    this.m_contextStr = a_context;
};

/**
 * set the offset of the selected word in  
 * the surrounding context
 * @param {int} a_pos the word offset 
 */
MP.SourceSelection.prototype.setContextPos = function(a_pos)
{
    this.m_contextPos = a_pos;
};

/**
 * set the rangeParent of the selection
 * @param {Node} a_parent the range parent 
 */
MP.SourceSelection.prototype.setRangeParent = function(a_parent)
{
    this.m_rangeParent = a_parent;
};

/**
 * given a callback conversion function, convert
 * the encoding of the selected word
 * @param {function} a_callback
 */
MP.SourceSelection.prototype.convertWord = function(a_callback)
{
    var converted = a_callback(this.m_word);
    this.setWord(converted);  
};

/**
 * compare this instance against another MP.SourceSelection
 * instance to see if they are equal
 * @param {MP.SourceSelection} a_other other instance
 * @return true or false
 * @type Boolean
 */
MP.SourceSelection.prototype.equals = function(a_other)
{
    //all fields must be equal
    if (a_other != null &&
        a_other instanceof MP.SourceSelection &&
        this.m_word == a_other.m_word &&
        this.m_wordStart == a_other.m_wordStart &&
        this.m_wordEnd == a_other.m_wordEnd &&
        this.m_contextStr == a_other.m_contextStr &&
        this.m_contextPos == a_other.m_contextPos)
    {   
        return true;
    }
    else
    {
        return false;
    }   
 }
