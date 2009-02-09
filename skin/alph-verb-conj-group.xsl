<?xml version="1.0" encoding="UTF-8"?>

<!--
    Stylesheet for transformation verb conjugation data to HTML
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema" exclude-result-prefixes="xs"
    xmlns:exsl="http://exslt.org/common">
    
    <!--
        This stylesheet groups the data on 3 attributes for the rows, 
        and groups on 3 attributes for the columns.
        Grouping attributes are supplied as parameters.
        Grouping parameters are required.
        A optional verb-ending parameter can be used to identify the verb-ending
        to be indicated as 'selected' in the HTML table.     
    -->
    
    <xsl:output method="html" encoding="UTF-8" indent="yes"/>
    
    <xsl:strip-space elements="*"/>
    
    <xsl:key name="footnotes" match="footnote" use="@id"/>
                
    <!-- all parameters may be supplied in transformation -->
    <!-- row groupings --> 
    <!-- default order is Tense, Number, Person -->
    <xsl:param name="group1" select="'tense'"/>
    <xsl:param name="group2" select="'num'"/>
    <xsl:param name="group3" select="'pers'"/>
    
    <!-- column groupings -->
    <!-- default order is Voice, Conjugation, Mood -->
    <xsl:param name="group4" select="'voice'"/>
    <xsl:param name="group5" select="'conj'"/>
    <xsl:param name="group6" select="'mood'"/>
    
    <!-- the following is optional, used to select specific verb-ending(s) -->
    <xsl:param name="selected_endings" select="/.." />
    
    <!-- skip the enclosing html and body tags -->
    <xsl:param name="fragment" />
        
    <xsl:template match="/">
        <xsl:choose>
            <xsl:when test="$fragment">
                <xsl:call-template name="verbtable">
                    <xsl:with-param name="endings" select="//infl-ending-set"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <html>
                    <head>
                        <link rel="stylesheet" type="text/css" href="alph-verb-conj-group.css"/>
                    </head>
                    <body>
                        <xsl:call-template name="verbtable">
                            <xsl:with-param name="endings" select="//infl-ending-set"/>
                        </xsl:call-template>                     
                    </body>
                </html>                
            </xsl:otherwise>
        </xsl:choose>            
    </xsl:template>
     
    <xsl:template name="verbtable">
        <xsl:param name="endings" />
        <table id="alph-infl-table"> <!-- start verb table -->
            <caption>
                <xsl:for-each select="$selected_endings//span[@class='alph-term']">
                    <xsl:if test="position() &gt; 1">
                        , 
                    </xsl:if>
                    <div class="alph-infl-term"><xsl:copy-of select="current()"/></div>    
                </xsl:for-each>
            </caption>
            <!-- write the colgroup elements -->
            <xsl:call-template name="colgroups">
                <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
                <xsl:with-param name="headerrow2" select="//order-item[@attname=$group5]"/>
                <xsl:with-param name="headerrow3" select="//order-item[@attname=$group6]"/>
            </xsl:call-template>        
            <!-- write the column header rows -->
            <xsl:call-template name="headers">
                <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
                <xsl:with-param name="headerrow2" select="//order-item[@attname=$group5]"/>
                <xsl:with-param name="headerrow3" select="//order-item[@attname=$group6]"/>
            </xsl:call-template>
            <!-- gather first level row grouping:
                 all attribute values for group1 attribute -->
            <xsl:variable name="firstgroup" select="$endings/@*[local-name(.)=$group1]"/>
            <!-- iterate though the items in the first group -->
            <xsl:for-each select="$firstgroup">
                <!-- lookup sort order for this attribute from order-table in the conjugation data -->
                <xsl:sort 
                    select="/infl-data/order-table/order-item[@attname=$group1 
                        and text()=current()]/@order" 
                    data-type="number"/>
                 <!-- if this is the first instance of this attribute value proceed to 
                      2nd level grouping -->
                 <xsl:if test="generate-id(.) = generate-id($firstgroup[.=current()])">
                    <xsl:variable name="lastgroup1" select="."/>
                    <!-- first instance of group1 row so add header row -->
                    <!-- TODO colspan should not be hardcoded -->
                    <tr id="{$lastgroup1}" class="group1row">
                        <th class="header-text always-visible" colspan="2">
                            <xsl:value-of select="$lastgroup1"/>
                            <xsl:call-template name="add-footnote">
                                <xsl:with-param name="item"
                                    select="/infl-data/order-table/order-item[@attname=$group1 
                                    and text()=$lastgroup1]" />
                            </xsl:call-template>                            
                        </th>
                        <xsl:call-template name="headerrow">
                            <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
                            <xsl:with-param name="headerrow2" select="//order-item[@attname=$group5]"/>
                            <xsl:with-param name="headerrow3" select="//order-item[@attname=$group6]"/>
                        </xsl:call-template>                                
                    </tr>                     
                    <!-- gather second level row grouping:
                         all group2 attribute values 
                         from all elements whose group1 attribute matches the current group1 value  
                    -->
                    <xsl:variable name="secondgroup" 
                        select="$endings/@*[local-name(.)=$group1 
                            and .=$lastgroup1]/../@*[local-name(.)=$group2]"/>
                    <!-- iterate through the items in the second group -->
                    <xsl:for-each select="$secondgroup">
                        <xsl:sort select="/infl-data/order-table/order-item[@attname=$group2 
                            and text()=current()]/@order" data-type="number"/>
                        <!-- if this the first instance of this attribute value proceed
                             to 3rd level grouping -->
                        <xsl:if test="generate-id(.) = generate-id($secondgroup[.=current()])">
                            <xsl:variable name="lastgroup2" select="."/>
                            <!-- gather third level row grouping:
                                 all group3 attribute values from:
                                 all elements whose group1 attribute matches the current group1 value
                                 and whose group2 attribute matches the current group2 values
                            -->   
                            <xsl:variable name="thirdgroup" 
                                select="$endings/@*[local-name(.)=$group1 
                                and .=$lastgroup1]/../@*[local-name(.)=$group2 
                                and . = $lastgroup2]/../@*[local-name(.)=$group3]"/>
                            <!-- iterate through the items in the third group -->
                            <xsl:for-each select="$thirdgroup">
                                <xsl:sort select="/infl-data/order-table/order-item[@attname=$group3 and text()=current()]/@order" 
                                    data-type="number"/>
                                <!-- start a new row to hold the data if this is the first instance of 
                                     this attribute value -->
                                <xsl:if test="generate-id(.) = generate-id($thirdgroup[.=current()])">
                                    <xsl:variable name="lastgroup3" select="."/>
                                    <xsl:variable name="row_id" select="concat($lastgroup1,$lastgroup2,$lastgroup3)"/>
                                    <tr class="data-row" id="{$row_id}"> <!-- start new row -->
                                        <xsl:choose>
                                            <xsl:when test="position()=1">
                                                <!-- add row header on left if it's the first row in 
                                                     this grouping -->
                                                <th class="group2header header-text">
                                                   <xsl:value-of select="$lastgroup2"/>
                                                    <xsl:call-template name="add-footnote">
                                                        <xsl:with-param name="item" 
                                                            select="/infl-data/order-table/order-item[@attname=$group2 
                                                            and text()=$lastgroup2]"/>
                                                    </xsl:call-template>
                                                </th>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <th class="emptyheader">&#160;</th>
                                            </xsl:otherwise>
                                        </xsl:choose>
                                        <!-- gather the actual verb-ending data in this grouping:
                                             all elements whose 
                                               - group1 attribute matches the current group1 value and
                                               - group2 attribute matches the current group2 value
                                               - group3 attribute matches the current group3 value
                                        -->
                                        <xsl:variable name="data"
                                            select="$endings/@*[local-name(.)=$group1 
                                                and .=$lastgroup1]/../@*[local-name(.)=$group2 
                                                and . = $lastgroup2]/../@*[local-name(.)=$group3 
                                                and .= $lastgroup3]/.."/>
                                        <xsl:call-template name="rowgroup">
                                            <xsl:with-param name="data" select="$data"/>
                                            <xsl:with-param name="groupheader" select="$lastgroup3"/>
                                        </xsl:call-template>
                                    </tr> 
                                </xsl:if>
                            </xsl:for-each>
                        </xsl:if>
                    </xsl:for-each>                                  
                </xsl:if>
            </xsl:for-each>
        </table> <!-- end verb table -->
    </xsl:template>
    
    <!-- template to write a group of rows of verb-ending data to the table -->
    <xsl:template name="rowgroup">
        <xsl:param name="data"/>
        <xsl:param name="groupheader"/>
        <xsl:for-each select="$data">
            <xsl:sort 
                select="/infl-data/order-table/order-item[@attname=$group4 
                    and text()=current()/@*[local-name(.)=$group4]]/@order" 
                data-type="number"/>
            <xsl:sort 
                select="/infl-data/order-table/order-item[@attname=$group5 
                    and text()=current()/@*[local-name(.)=$group5]]/@order" 
                data-type="number"/>
            <xsl:sort 
                select="/infl-data/order-table/order-item[@attname=$group6 
                    and text()=current()/@*[local-name(.)=$group6]]/@order" 
                data-type="number"/>
            <xsl:if test="position()=1">
                <!-- add the row header cell if it's the first cell in 
                    the row -->
                <th class="rowgroupheader header-text">
                    <xsl:value-of select="$groupheader"/>
                    <xsl:call-template name="add-footnote">
                        <xsl:with-param name="item" select="/infl-data/order-table/order-item[@attname=$groupheader]"/>
                    </xsl:call-template>
                </th>
            </xsl:if>
            <td>
                <xsl:variable name="verb-endings" select="infl-ending"/>
                <xsl:for-each select="$verb-endings">
                    <xsl:variable name="entries" select="count($selected_endings/div[@class='alph-entry'])"/>                    
                    <xsl:variable name="selected" 
                        select="$selected_endings
                            [
                              (div[@class='alph-dict']//span[@class='alph-conj']/@context = current()/../@conj)
                              and
                              (div[@class='alph-infl-set']/
                              div[
                              @class='alph-infl' 
                              and (span[@class='alph-tense']/text() = current()/../@tense)
                              and (span[@class='alph-voice']/text() = current()/../@voice)
                              and (span[@class='alph-mood']/@context = current()/../@mood)
                              and (span[@class='alph-pers']/@context = current()/../@pers)
                              and (span[@class='alph-num']/@context = current()/../@num)
                              ])
                            ]"/>    
                    <xsl:variable name="selected_class">
                        <!-- if this ending matches the one supplied in the template params
                             then add a 'selected' class to the data element -->
                        <xsl:if test="$selected">selected</xsl:if>    
                    </xsl:variable>
                    <xsl:variable name="notfirst">
                        <xsl:if test="position() &gt; 1">notfirst</xsl:if>
                    </xsl:variable>
                    <span class="ending {@type} {$selected_class} {$notfirst}">
                        <xsl:value-of select="."/>
                    </span>
                    <xsl:call-template name="add-footnote">
                        <xsl:with-param name="item" select="."/>
                    </xsl:call-template>
                </xsl:for-each>    
            </td>
        </xsl:for-each>        
    </xsl:template>
    
    <!-- template to produce header rows for the table columns -->    
    <xsl:template name="headers">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:param name="headerrow3"/>
        <xsl:variable name="row2count" select="count($headerrow2)"/> 
        <xsl:variable name="row3count" select="count($headerrow3)"/>
        <tr id="headerrow1">
            <th colspan="2" class="always-visible">
                <span class="header-text"><xsl:value-of select="$group4"/></span>    
                <xsl:call-template name="stem-header">
                    <xsl:with-param name="header" select="$group4"/>
                </xsl:call-template>                
            </th>        
            <xsl:for-each select="$headerrow1">
                <xsl:sort select="@order" data-type="number"/>
                <xsl:variable name="colspan" 
                    select="$row2count * $row3count"/>
                    <th colspan="{$colspan}">
                        <span class="header-text"><xsl:value-of select="."/></span>
                        <xsl:apply-templates select="."/>                       
                    </th>
            </xsl:for-each>            
        </tr>
        <tr id="headerrow2">
            <th colspan="2" class="always-visible">
                <span class="header-text"><xsl:value-of select="$group5"/></span>
                <xsl:call-template name="stem-header">
                    <xsl:with-param name="header" select="$group5"/>
                </xsl:call-template>                
            </th>        
            <xsl:for-each select="$headerrow1">
                <xsl:sort select="@order" data-type="number"/>               
                <xsl:for-each select="$headerrow2">
                    <xsl:sort select="@order" data-type="number"/>
                     <th colspan="{$row3count}">
                         <span class="header-text" ><xsl:value-of select="."/></span>
                         <xsl:apply-templates select="."/>                        
                     </th>        
                </xsl:for-each>
            </xsl:for-each>
        </tr>
        <tr id="headerrow3">
            <th colspan="2" class="header-text always-visible">
                <span class="header-text"><xsl:value-of select="$group6"/></span>
                <xsl:call-template name="stem-header">
                    <xsl:with-param name="header" select="$group6"/>
                </xsl:call-template>
            </th>        
            <xsl:for-each select="$headerrow1">
                <xsl:sort select="@order" data-type="number"/>                
                <xsl:for-each select="$headerrow2">
                    <xsl:sort select="@order" data-type="number"/>
                    <xsl:for-each select="$headerrow3">
                        <xsl:sort select="@order" data-type="number"/>
                        <th>
                            <span  class="header-text"><xsl:value-of select="."/></span>
                            <xsl:apply-templates select="."/>
                        </th>        
                    </xsl:for-each>
                </xsl:for-each>
            </xsl:for-each>
        </tr>
    </xsl:template>
    
    <!-- template to produce header for stem header row -->
    <xsl:template name="stem-header">
        <xsl:param name="header"/>
        <xsl:if test="$header='conj'">
            <br/><span class="header-text">stem</span>
        </xsl:if>
    </xsl:template>
    
    <!-- template to produce data for stem header row -->
    <xsl:template name="stem-data" match="order-item[@attname='conj']">        
        <br/>
        <xsl:variable name="thisconj" select="text()"/>
        <xsl:value-of select="/infl-data/stem-table/stem[@conj=$thisconj]"/>
        <xsl:call-template name="add-footnote">
            <xsl:with-param name="item" select="."/>
        </xsl:call-template>                
    </xsl:template>
    
    <xsl:template name="no-sub" match="order-item">
        <xsl:call-template name="add-footnote">
            <xsl:with-param name="item" select="."/>
        </xsl:call-template>        
    </xsl:template>
    
    <!-- template to produce colgroups for the table columns -->
    <xsl:template name="colgroups">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:param name="headerrow3"/>
        <xsl:variable name="row2count" select="count($headerrow2)"/>
        <xsl:variable name="row3count" select="count($headerrow3)"/>
        <colgroup class="leftheader">
            <col realIndex="0"/>
            <col realIndex="1"/>
        </colgroup>
        <xsl:for-each select="$headerrow1">
            <xsl:variable name="row1pos" select="position()-1"/>            
            <colgroup class="header1">              
                <xsl:for-each select="$headerrow2">
                    <xsl:variable name="row2pos" select="position()-1"/>
                    <xsl:for-each select="$headerrow3">
                        <xsl:variable name="index" 
                            select="($row1pos * $row3count * $row2count) + 
                                    ($row2pos * $row3count) + position() + 1"/>
                        <col class="header3col" realIndex="{$index}" 
                            row1pos="{$row1pos}"
                            row2pos="{$row2pos}"
                            row3count="{$row3count}"
                        />
                    </xsl:for-each>
                </xsl:for-each>
            </colgroup>
        </xsl:for-each>       
    </xsl:template>
    
    <xsl:template name="headerrow">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:param name="headerrow3"/>
        <xsl:variable name="row2count" select="count($headerrow2)"/>
        <xsl:variable name="row3count" select="count($headerrow3)"/>
        <xsl:for-each select="$headerrow1">
                <xsl:for-each select="$headerrow2">
                    <xsl:for-each select="$headerrow3">
                        <td>&#160;</td>
                    </xsl:for-each>
                </xsl:for-each>
        </xsl:for-each>       
    </xsl:template>
    
    <xsl:template name="add-footnote">
        <xsl:param name="item"/>
        <xsl:if test="$item/@footnote">
            <a href="#{$item/@footnote}" class="footnote"><xsl:value-of select="substring-after($item/@footnote,'-')"/></a>
            <span class="footnote-text"><xsl:value-of select="key('footnotes',$item/@footnote)"/></span>    
        </xsl:if>
    </xsl:template>    
</xsl:stylesheet>