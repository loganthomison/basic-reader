/**
 * @fileoverview This module contains the TreeDiagram data object 
 * Exports a single symbol, TreeDiagram which must be imported into the 
 * namespace of the importing class.
 *
 * @version $Id: TreeDiagram.jsm 2138 2009-10-05 11:50:59Z BridgetAlmas $
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

const EXPORTED_SYMBOLS = ['TreeDiagram'];

Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm");
Components.utils.import("resource://alpheios/datatypes/XmlDataType.jsm");

const NAMESPACE = "http://nlp.perseus.tufts.edu/syntax/treebank/1.5";
const SCHEMA = "http://nlp.perseus.tufts.edu/syntax/treebank/1.5 treebank-1.5.xsd";

/**
 * @class TreeDiagram
 * @extends DataType 
 */
TreeDiagram= function(a_file, a_charset,a_args)
{
    XmlDataType.call(this,a_file,a_charset,a_args);
};

/**
 * @ignore
 */
TreeDiagram.prototype = new XmlDataType();

/**
 * TreeDiagram initialization
 * @param Object a_args initialiation parameters - should be:
 *              { format: tree format, lang: language }
 */
TreeDiagram.prototype.init = function(a_args)
{
    this.setFormat(a_args.format);
    this.setLang(a_args.lang);
}

/**
 * TreeDiagram datatype's file type extension
 * @static
 */
TreeDiagram.s_fileSpec = '.xml';

/**
 * get the default data contents
 */
TreeDiagram.prototype.getDefault = function()
{   
    var recent_win = BrowserUtils.getMostRecentWindow("navigator:browser");        
    var template =                
       '<treebank ' + 
       '  xmlns="' + NAMESPACE + '"' +
       '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
       '  xsi:schemaLocation="' + SCHEMA + '"' +
       '  version="1.5"' +
       '  format="' + this.d_format + '"' +
       '  xml:lang="' + this.d_lang + '"></treebank>';        
    var doc = (new recent_win.DOMParser()).parseFromString(template,"text/xml");
    return doc;
};

/**
 * set the format of the diagram
 * @param {String} a_format
 */
TreeDiagram.prototype.setFormat = function(a_format)
{
    this.d_format = a_format;   
};

/**
 * set the language for the diagram
 * @param {String} a_lang the language
 */
TreeDiagram.prototype.setLang = function(a_lang)
{
    this.d_lang = a_lang;        
};

/**
 * Add a new sentence to the treebank data object
 * @param {Window} a_window the calling window
 * @param {Array} a_words the new sentence, as an array of words
 * @return the new sentence as an xml Element                                 
 */
TreeDiagram.prototype.addSentence = function(a_window,a_words)
{
    var id = this.d_dataObj.getElementsByTagName('sentence').length + 1;
    var document_id = BrowserUtils.getLocalFileName(this.d_srcFile).replace(/\.[^\.]+$/,'');
    var sentence = this.d_dataObj.createElement("sentence");
    //sentence.setAttribute("xmlns",NAMESPACE);
    sentence.setAttribute("id",id);
    sentence.setAttribute("document_id",document_id);
    sentence.setAttribute("subdoc","");
    for (var i=0; i<a_words.length; i++)
    {
        var word = this.d_dataObj.createElement("word");
        word.setAttribute("id",i+1);
        word.setAttribute("form",a_words[i]);
        word.setAttribute("postag",'-');
        word.setAttribute("head",0);
        word.setAttribute("relation","nil");
        sentence.appendChild(word);
    }
    this.d_dataObj.documentElement.appendChild(sentence);
    // update the raw string
    this.d_raw = this.serialize();
    this.observeSetter(a_window);
    return sentence;        
};

/**
 * get a sentence from the data file
 * @param {Window} a_window the calling window
 * @param {String} a_id the sentence id
 * @returns the serialized sentence xml
 * @type String
 */
TreeDiagram.prototype.getSentence = function(a_window,a_id)
{
    var sentence = null;
    try {
        
     sentence=a_window.XMLSerializer().serializeToString(this._getSentenceElem(a_id));
    }
    catch(a_e)
    {
        BrowserUtils.debug("Unable to retrieve sentence " + a_id + ":" + a_e);
    }          
    return sentence;
};

/**
 * get a sentence node from the data file
 * @param {String} a_id the sentence id
 * @returns the sentence
 * @type Element
 * @private
 */
TreeDiagram.prototype._getSentenceElem = function(a_id)
{
    var sentences = this.d_dataObj.documentElement.getElementsByTagName("sentence");
    var sentence = null;
    for (var i=0; i<sentences.length; i++)
    {
        if (sentences[i].getAttribute("id") == a_id)
        {
            sentence = sentences[i];
            break;
        }
    }
          
    return sentence;
};

/**
 * put an updated version of a sentence into the data file
 * @param {Window} a_window the calling window
 * @param {String} a_sentence the serialized updated sentence xml
 * @param {String} a_id the id of the sentence 
 */
TreeDiagram.prototype.putSentence = function(a_window,a_sentence,a_id)
{        
    var sent_node = a_window.DOMParser()
                            .parseFromString(a_sentence,"text/xml");                          
    var sentence  = this._getSentenceElem(a_id);
    var words = sentence.getElementsByTagName('word');    
    while (words.length > 0)
    {
        sentence.removeChild(words[0]);
    }
    
    var new_words = sent_node.documentElement.getElementsByTagName('word'); 
    for (var j=0; j<new_words.length; j++)
    {        
        var node = this.d_dataObj.importNode(new_words[j],true);
        sentence.appendChild(node);        
    }            
    // update the raw string
    this.d_raw = this.serialize();
    this.observeSetter(a_window);
};

/**
 * get the list of sentences in this diagram
 * @param {Window} a_window the calling window
 * @returns the list of sentences in an array of elements of the format:
 *          [ sentence_id: sentence_as_string_of_words ]
 */
TreeDiagram.prototype.getSentenceList = function(a_window)
{
    var list = [];
    var sentences = this.d_dataObj.documentElement.getElementsByTagName("sentence");    
    for (var i=0; i<sentences.length; i++)
    {                
        var children = sentences[i].getElementsByTagName('word');
        var raw = new Array(children.length);
        for (var j=0; j<children.length; j++)    
        {
            var form = children[j].getAttribute('form');
            var id = children[j].getAttribute('id');
            raw[id] = form || ""           
        }
        
        list.push(
            [sentences[i].getAttribute('id'),raw.join(' ')]);        
    }    
    return list;
}