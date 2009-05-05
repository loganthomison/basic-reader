<?xml version="1.0" encoding="UTF-8"?>

<!--
    Stylesheet for transformation of inflection data to HTML
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema" exclude-result-prefixes="xs"
    xmlns:exsl="http://exslt.org/common"
    xmlns:xlink="http://www.w3.org/1999/xlink">
    <xsl:import href="alph-query-ending.xsl"/>
    <xsl:import href="alph-infl-match.xsl"/>
    <xsl:import href="alph-infl-extras.xsl"/>    
    <!--
        This stylesheet groups the data on 3 attributes for the rows, 
        and groups on 1 variable attribute plus the type for the columns.
        The variable grouping attribute is supplied as a parameter.
        A optional ending parameter can be used to identify the ending
        to be indicated as 'selected' in the HTML table.     
    -->
    
    <xsl:output method="html" encoding="UTF-8" indent="yes"/>
    
    <xsl:strip-space elements="*"/>
    
    <xsl:key name="footnotes" match="footnote" use="@id"/>
                
    <!-- all parameters may be supplied in transformation -->

     <xsl:param name="decl"/>
    
    <!-- row groupings --> 
    <xsl:param name="group1" select="'case'"/>
    
    <!-- column groupings -->
    <!-- default order is Declension, Gender-->
    <xsl:param name="group4" select="'num'"/>
    <xsl:param name="group5" select="'gend'"/>
    
    <!-- the following are optional, used to select specific inflection ending(s) -->
    <xsl:param name="selected_endings" select="/.." />
    <xsl:param name="form" />
    
    <!-- by default greek vowel length is stripped but this can be overridden -->
    <xsl:param name="strip_greek_vowel_length" select="true()"/>
    
    <!-- transliterate unicode in the ending tables before matching? -->
    <xsl:param name="translit_ending_table_match" select="false()"/>
    <!-- by default this stylesheet applies to nouns, but may also be
         used for adjectives or other parts of speech -->
    <xsl:param name="match_pofs" select="'noun'"/>
            
    <!-- skip the enclosing html and body tags -->
    <xsl:param name="fragment" />
        
    <xsl:template match="/infl-data">
        <xsl:variable name="table-notes">
            <xsl:if test="@footnote">
                <div id="table-notes">
                    <xsl:call-template name="add-footnote">
                        <xsl:with-param name="item" select="."/>
                    </xsl:call-template>
                </div>
            </xsl:if>    
        </xsl:variable>        
        <xsl:choose>
            <xsl:when test="$fragment">
                <xsl:copy-of select="$table-notes"/>
                <xsl:call-template name="infltable">
                    <xsl:with-param name="endings" select="//infl-ending-set[contains($decl,@decl)]"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <html>
                    <head>
                    </head>
                    <body>
                        <xsl:copy-of select="$table-notes"/>
                        <xsl:call-template name="infltable">
                            <xsl:with-param name="endings" select="//infl-ending-set[contains($decl,@decl)]"/>
                        </xsl:call-template>                     
                    </body>
                </html>                
            </xsl:otherwise>
        </xsl:choose>            
    </xsl:template>
     
    <xsl:template name="infltable">
        <xsl:param name="endings" />
        <table id="alph-infl-table"> <!-- start table -->
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
            </xsl:call-template>        
            <!-- write the column header rows -->
            <xsl:call-template name="headers">
                <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
                <xsl:with-param name="headerrow2" select="//order-item[@attname=$group5]"/>
            </xsl:call-template>
            <!-- gather first level row grouping:
                all attribute values for group1 attribute -->
            <xsl:variable name="firstgroup" select="$endings/@*[local-name(.)=$group1]"/>
            <!-- iterate though the items in the first group -->
            <xsl:for-each select="$firstgroup">
                <!-- lookup sort order for this attribute from order-table in the inflection data -->
                <xsl:sort 
                    select="/infl-data/order-table/order-item[@attname=$group1 
                    and text()=current()]/@order" 
                    data-type="number"/>
                <xsl:if test="generate-id(.) = generate-id($firstgroup[.=current()])">
                    <xsl:variable name="lastgroup1" select="."/>
                    <tr class="data-row" context="{$lastgroup1}"> <!-- start new row -->
                        <th class="emptyheader">&#160;</th>
                        <!-- gather the actual ending data in this grouping:
                             all elements whose 
                             - group1 attribute matches the current group1 value and
                        -->
                        <xsl:variable name="data"
                            select="$endings/@*[local-name(.)=$group1 
                                        and .=$lastgroup1]/.."/>
                        <xsl:call-template name="rowgroup">
                            <xsl:with-param name="data" select="$data"/>
                            <xsl:with-param name="groupheader" select="$lastgroup1"/>
                        </xsl:call-template>
                    </tr> 
                </xsl:if>
            </xsl:for-each>            
        </table> <!-- end infl table -->
    </xsl:template>
    
    <!-- template to write a group of rows of infl-ending data to the table -->
    <xsl:template name="rowgroup">
        <xsl:param name="data"/>
        <xsl:param name="groupheader"/>
        <xsl:variable name="group4_vals" select="//order-item[@attname=$group4]"/>
        <xsl:variable name="group5_vals" select="//order-item[@attname=$group5]"/>

        <xsl:for-each select="$group4_vals">
            <xsl:sort 
            select="@order"/>
            <xsl:variable name="lastgroup4" select="."/>
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
            <xsl:for-each select="$group5_vals">
                <xsl:sort select="@order"/> 
                <xsl:variable name="lastgroup5" select="."/>
                <xsl:variable name="celldata"
                    select="$data/@*[local-name(.)=$group4 
                    and .=$lastgroup4]/../@*[local-name(.)=$group5 
                    and . = $lastgroup5]/.."/>
                <xsl:variable name="selected">
                    <xsl:call-template name="check_infl_sets">
                        <xsl:with-param name="current_data" select="$celldata" />
                        <xsl:with-param name="selected_endings" select="$selected_endings"/>
                        <xsl:with-param name="match_pofs" select="$match_pofs"/>
                        <xsl:with-param name="strip_greek_vowel_length" select="$strip_greek_vowel_length"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:variable name="context">
                    <xsl:call-template name="infl-set-context">
                        <xsl:with-param name="infl_set" select="$celldata"/>
                    </xsl:call-template>
                </xsl:variable>                                
                <xsl:call-template name="ending-cell">
                    <xsl:with-param name="infl-endings" select="$celldata"/>
                    <xsl:with-param name="selected" select="$selected"/>
                    <xsl:with-param name="selected_endings" select="$selected_endings"/>
                    <xsl:with-param name="translit_ending_table_match" select="$translit_ending_table_match"/>
                    <xsl:with-param name="strip_greek_vowel_length" select="$strip_greek_vowel_length"/>
                    <xsl:with-param name="context" select="$context"/>
                </xsl:call-template>
            </xsl:for-each>            
        </xsl:for-each>
    </xsl:template>
        
    <!-- template to produce header rows for the table columns -->    
    <xsl:template name="headers">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:param name="headerrow3"/>
        <xsl:variable name="row2count" select="count($headerrow2)"/>
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
                    select="'2'"/>
                    <th colspan="{$row2count}">
                        <span class="header-text"><xsl:value-of select="."/></span>
                        <xsl:apply-templates select="."/>
                    </th>
            </xsl:for-each>            
        </tr>
        <tr id="headerrow2" class='expand-ctl'>
            <th colspan="2" class="always-visible">
                <span class="header-text"><xsl:value-of select="$group5"/></span>    
                <xsl:call-template name="stem-header">
                    <xsl:with-param name="header" select="$group5"/>
                </xsl:call-template>                
            </th>        
            <xsl:for-each select="$headerrow1">
                <xsl:sort select="@order" data-type="number"/>
                <xsl:for-each select="$headerrow2">
                    <th colspan="1">
                        <span class="header-text"><xsl:value-of select="."/></span>
                        <xsl:apply-templates select="."/>
                    </th>
                </xsl:for-each>
            </xsl:for-each>            
        </tr>
    </xsl:template>
    
    <!-- template to produce colgroups for the table columns -->
    <xsl:template name="colgroups">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:variable name="row2count" select="count($headerrow2)"/>
        <colgroup class="leftheader">
            <col realIndex="0"/>
            <col realIndex="1"/>
        </colgroup>
        <xsl:for-each select="$headerrow1">
            <xsl:variable name="row1pos" select="position()-1"/>            
            <colgroup class="header1">              
                <xsl:for-each select="$headerrow2">
                    <xsl:variable name="row2pos" select="position()-1"/>
                    <xsl:variable name="index" 
                            select="($row1pos *  $row2count) + 
                            position() + 1"/>
                        <col class="header2col" realIndex="{$index}" 
                            row1pos="{$row1pos}"
                            row2pos="{$row2pos}"/>
                </xsl:for-each>
            </colgroup>
        </xsl:for-each>               
    </xsl:template>
    
    <xsl:template name="headerrow">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:param name="headerrow3"/>
        <xsl:for-each select="$headerrow1">
            <td colspan="2">&#160;</td>
        </xsl:for-each>       
    </xsl:template>
    
</xsl:stylesheet>
