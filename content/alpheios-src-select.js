/**
 * @fileoverview This file defines the Alph.SourceSelection class prototype.
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


/**
 * @class  Alph.SourceSelection defines the properties of the target of the 
 * user's selection in the source text, as identified by the 
 * {@link Alph.LanguageTool#findSelection} method.
 *  
 * @constructor 
 * @param {Properties} a_properties additional properties to set as private members of 
 *                                  the object (accessor methods will be dynamically created)
 */
Alph.SourceSelection = function(a_properties) 
{
     this.setAccessors(a_properties);
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
Alph.SourceSelection.prototype.setAccessors = function(a_properties) 
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
Alph.SourceSelection.prototype.d_word = '';

/**
 * the offset in the original string which represents the
 * start of the word
 * @private
 * @type int
 */
Alph.SourceSelection.prototype.d_wordStart = 0;

/**
 * the offset in the original string which represents the
 * end of the word
 * @private
 * @type int
 */
Alph.SourceSelection.prototype.d_wordEnd = 0;

/**
 * optional relevant surrounding context
 * @private
 * @type String
 */
Alph.SourceSelection.prototype.d_contextStr = '';

/**
 * position of the word in the surrounding context
 * @private
 * @type int  
 */
Alph.SourceSelection.prototype.d_contextPos = 0;

/**
 * rangeParent node for the selection
 * @private
 * @type Node 
 */
Alph.SourceSelection.prototype.d_rangeParent;

/**
 * treebankQueryUrl for the selection
 * @private
 * @type String
 */
Alph.SourceSelection.prototype.d_treebankQuery = null;

/**
 * gets the selected 'word'
 * @returns the word
 * @type String
 */
Alph.SourceSelection.prototype.getWord = function()
{
    return this.d_word;   
};

/**
 * get the offset in the original string which represents 
 * the selected word starting position
 * @returns the word starting position
 * @type int 
 */
Alph.SourceSelection.prototype.getWordStart = function()
{
    return this.d_wordStart
};

/**
 * get the offset in the original string which represents 
 * the selected word ending position
 * @returns the word ending position
 * @type int 
 */
Alph.SourceSelection.prototype.getWordEnd = function()
{
    return this.d_wordEnd
};

/**
 * get the surrounding context 
 * @returns the surrounding context
 * @type String
 */
Alph.SourceSelection.prototype.getContext = function()
{
    return this.d_contextStr;
};

/**
 * get the offset of the selected word in  
 * the surrounding context
 * @returns the word offset
 * @type int 
 */
Alph.SourceSelection.prototype.getContextPos = function()
{
    return this.d_contextPos;
};

/**
 * get the rangeParent of the selection
 * @returns the range parent
 * @type Node 
 */
Alph.SourceSelection.prototype.getRangeParent = function(a_parent)
{
    return this.d_rangeParent;
};

/**
 * get the treebankQuery for the selection
 * @returns the treebank query url
 * @type String
 */
Alph.SourceSelection.prototype.getTreebankQuery = function()
{
    return this.d_treebankQuery;
};

/**
 * sets the selected 'word'
 * @param {String} a_word the word
 */
Alph.SourceSelection.prototype.setWord = function(a_word)
{
    this.d_word = a_word;   
};

/**
 * set the offset in the original string which represents 
 * the selected word starting position
 * @param {int} a_pos the word starting position
 */
Alph.SourceSelection.prototype.setWordStart = function(a_pos)
{
    this.d_wordStart = a_pos;
};

/**
 * set the offset in the original string which represents 
 * the selected word ending position
 * @param {int} a_pos the word ending position
 */
Alph.SourceSelection.prototype.setWordEnd = function(a_pos)
{
    this.d_wordEnd = a_pos;
};

/**
 * set the surrounding context 
 * @param {String} a_context the surrounding context
 */
Alph.SourceSelection.prototype.setContext = function(a_context)
{
    this.d_contextStr = a_context;
};

/**
 * set the offset of the selected word in  
 * the surrounding context
 * @param {int} a_pos the word offset 
 */
Alph.SourceSelection.prototype.setContextPos = function(a_pos)
{
    this.d_contextPos = a_pos;
};

/**
 * set the rangeParent of the selection
 * @param {Node} a_parent the range parent 
 */
Alph.SourceSelection.prototype.setRangeParent = function(a_parent)
{
    this.d_rangeParent = a_parent;
};

/**
 * set the treebankQuery for the selection
 * @param {String} a_url the treebank query url 
 */
Alph.SourceSelection.prototype.setTreebankQuery = function(a_url)
{
    this.d_treebankQuery = a_url;
};

/**
 * given a callback conversion function, convert
 * the encoding of the selected word
 * @param {function} a_callback
 */
Alph.SourceSelection.prototype.convertWord = function(a_callback)
{
    var converted = a_callback(this.d_word);
    this.setWord(converted);  
};

/**
 * compare this instance against another Alph.SourceSelection
 * instance to see if they are equal
 * @param {Alph.SourceSelection} a_other other instance
 * @returns true or false
 * @type Boolean
 */
Alph.SourceSelection.prototype.equals = function(a_other)
{
    //all fields must be equal
    if (a_other != null &&
        a_other instanceof Alph.SourceSelection &&
        this.d_word == a_other.d_word &&
        this.d_wordStart == a_other.d_wordStart &&
        this.d_wordEnd == a_other.d_wordEnd &&
        this.d_contextStr == a_other.d_contextStr &&
        this.d_contextPos == a_other.d_contextPos &&
        this.d_rangeParent == a_other.d_rangeParent)
    {   
        return true;
    }
    else
    {
        return false;
    }   
 }
