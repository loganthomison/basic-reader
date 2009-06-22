<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema" exclude-result-prefixes="xs"
    xmlns:exsl="http://exslt.org/common"
    xmlns:xlink="http://www.w3.org/1999/xlink">
    
    <!--
        Copyright 2009 Cantus Foundation
        http://alpheios.net
        
        This file is part of Alpheios.
        
        Alpheios is free software: you can redistribute it and/or modify
        it under the terms of the GNU General Public License as published by
        the Free Software Foundation, either version 3 of the License, or
        (at your option) any later version.
        
        Alpheios is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        GNU General Public License for more details.
        
        You should have received a copy of the GNU General Public License
        along with this program.  If not, see <http://www.gnu.org/licenses/>.
    -->
    
    <!--
        Stylesheet for transformation of inflection data to html for use in query mode

        This stylesheet groups the data on 2 attributes for the rows, 
        and groups on 2 attributes for the columns.
        
        It also supports filtering the data set by an attribute key/value pair
        
        Parameters: per alph-infl-params.xsl
        
        Additional Parameters:
            $filter_key
            $filter_value
    -->
    <xsl:import href="alph-infl-params.xsl"/>
    <xsl:import href="alph-query-ending.xsl"/>
    <xsl:import href="alph-infl-match.xsl"/>
    <xsl:import href="alph-infl-extras.xsl"/>    
    
    <xsl:output method="html" encoding="UTF-8" indent="yes"/>
    
    <xsl:strip-space elements="*"/>
    
    <xsl:key name="footnotes" match="footnote" use="@id"/>
    
    <!-- optional filter for inflection data -->
    <xsl:param name="filter_key"/>
    <xsl:param name="filter_value"/>
            
    <xsl:template match="/infl-data">
        <xsl:variable name="table-notes">
            <!--xsl:if test="@footnote">
                <div id="table-notes">
                <xsl:call-template name="add-footnote">
                    <xsl:with-param name="item" select="."/>
                </xsl:call-template>
                </div>
            </xsl:if-->    
        </xsl:variable>
        
        <!-- filter the data by the attribute name/value pair identified 
            in the parameters
        -->
 
        <xsl:choose>
            <xsl:when test="$fragment">
                <xsl:copy-of select="$table-notes"/>
                <xsl:choose>
                    <xsl:when test="$filter_key and $filter_value">
                        <xsl:call-template name="infltable">
                            <xsl:with-param name="endings" select="//infl-ending-set/@*[local-name(.)=$filter_key
                                and .= $filter_value]/.."/>
                        </xsl:call-template>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:call-template name="infltable">
                            <xsl:with-param name="endings" select="//infl-ending-set"/>
                        </xsl:call-template>                                
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <html>
                    <head>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl.css"/>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl-{$match_pofs}.css"/>
                    </head>
                    <body>
                        <xsl:copy-of select="$table-notes"/>
                        <xsl:choose>
                            <xsl:when test="$filter_key and $filter_value">
                                <xsl:call-template name="infltable">
                                    <xsl:with-param name="endings" select="//infl-ending-set/@*[local-name(.)=$filter_key
                                        and .= $filter_value]/.."/>
                                </xsl:call-template>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:call-template name="infltable">
                                    <xsl:with-param name="endings" select="//infl-ending-set"/>
                                </xsl:call-template>                                
                            </xsl:otherwise>
                        </xsl:choose>
                    </body>
                </html>                
            </xsl:otherwise>
        </xsl:choose>            
    </xsl:template>
     
    <xsl:template name="infltable">
        <xsl:param name="endings" />
        <xsl:variable name="nomatch" select="count($endings) = 0"/>
        <xsl:element name="table"> <!-- start table -->
            <xsl:attribute name="id">alph-infl-table</xsl:attribute>
            <xsl:if test="$nomatch">
                <xsl:attribute name="class">nomatch</xsl:attribute>
            </xsl:if>
            <!-- add the caption -->
            <caption class="query-caption">    
                <xsl:call-template name="form_caption">
                    <xsl:with-param name="selected_endings" select="$selected_endings"/>
                    <xsl:with-param name="form" select="$form"/>
                    <xsl:with-param name="has_data" select="not($nomatch)"/>
                </xsl:call-template>
            </caption>
            <xsl:choose>
                <xsl:when test="$nomatch">
                    <tr><td>
                    <xsl:call-template name="make_ref_link">
                        <xsl:with-param name="target" select="$link_content"></xsl:with-param>
                    </xsl:call-template>
                    </td></tr>
                </xsl:when>
                <xsl:otherwise>
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
                        <!-- if this is the first instance of this attribute value proceed to 
                            2nd level grouping -->
                        <xsl:if test="generate-id(.) = generate-id($firstgroup[.=current()])">
                            <xsl:variable name="lastgroup1" select="."/>
                            <!-- gather second level row grouping:
                                all group2 attribute values 
                                from all elements whose group1 attribute matches the current group1 value  
                            -->                    
                            <xsl:variable name="secondgroup" 
                                select="$endings/@*[local-name(.)=$group1 
                                and .=$lastgroup1]/../@*[local-name(.)=$group2]"/>   
                            <!-- first instance of group1 row so add header row -->
                            <!-- TODO colspan should not be hardcoded -->
                            <tr id="header-{$lastgroup1}" class="group1row">
                                <xsl:element name="th">
                                    <xsl:attribute name="class">always-visible</xsl:attribute>
                                    <xsl:attribute name="colspan">2</xsl:attribute>
                                    <xsl:attribute name="context"><xsl:value-of select="$group1"/></xsl:attribute>
                                    <xsl:attribute name="{concat('alph-',$group1)}">
                                        <xsl:value-of select="
                                            concat('|',translate($lastgroup1,' ','|'),'|')"/>
                                    </xsl:attribute>
                                    <span class="header-text">
                                        <xsl:value-of select="$lastgroup1"/>
                                    </span>
                                    <!--xsl:call-template name="add-footnote">
                                        <xsl:with-param name="item" select="/infl-data/order-table/order-item[@attname=$groupheader]"/>
                                    </xsl:call-template-->
                                </xsl:element>                                
                                <xsl:call-template name="headerrow">
                                    <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
                                    <xsl:with-param name="headerrow2" select="//order-item[@attname=$group5]"/>
                                    <xsl:with-param name="headerrow3" select="//order-item[@attname=$group6]"/>
                                </xsl:call-template>        
                            </tr>
                            <!-- if none in 2nd group, just add the items in the first group -->                    
                            <xsl:if test="count($secondgroup) = 0">
                                <tr class="data-row">
                                    <th class="emptyheader" colspan="2">&#160;</th>
                                    <xsl:for-each select="$endings/@*[local-name(.)=$group1 and .=$lastgroup1]/..">
                                        <xsl:call-template name="ending-cell">
                                            <xsl:with-param name="infl-endings" select="."/>
                                            <xsl:with-param name="no_grouping" select="true()"/>
                                            <xsl:with-param name="translit_ending_table_match" select="$translit_ending_table_match"/>
                                            <xsl:with-param name="dedupe_by" select="$dedupe_by"/>
                                            <xsl:with-param name="show_only_matches" select="$show_only_matches"/>
                                            <xsl:with-param name="match_form" select="$match_form"/>
                                        </xsl:call-template>                                    
                                    </xsl:for-each>
                                </tr>
                            </xsl:if>                                         
                            
                            <!-- iterate through the items in the second group -->
                            <xsl:for-each select="$secondgroup">
                                <xsl:sort select="/infl-data/order-table/order-item[@attname=$group2 
                                    and text()=current()]/@order" data-type="number"/>
                                <!-- start a new row to hold the data if this is the first instance of 
                                    this attribute value -->
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
                                    <xsl:if test="count($thirdgroup) = 0">
                                        <xsl:variable name="row_id" select="concat($lastgroup1,$lastgroup2)"/>
                                        <tr class="data-row" id="{$row_id}"> <!-- start new row -->
                                            <th class="emptyheader">&#160;</th>
                                            <!-- gather the actual ending data in this grouping:
                                                all elements whose 
                                                - group1 attribute matches the current group1 value and
                                                - group2 attribute matches the current group2 value
                                            -->
                                            <xsl:variable name="data"
                                                select="$endings/@*[local-name(.)=$group1 
                                                and .=$lastgroup1]/../@*[local-name(.)=$group2 
                                                and . = $lastgroup2]/.."/>
                                            <xsl:call-template name="rowgroup">
                                                <xsl:with-param name="data" select="$data"/>
                                                <xsl:with-param name="context" select="$group2"/>
                                                <xsl:with-param name="groupheader" select="$lastgroup2"/>
                                                <xsl:with-param name="colgroup" select="$lastgroup1"/> 
                                            </xsl:call-template>
                                        </tr> 
                                    </xsl:if>
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
                                                        <xsl:element name="th">
                                                            <xsl:attribute name="class">group2header</xsl:attribute>
                                                            <xsl:attribute name="context"><xsl:value-of select="$group2"/></xsl:attribute>
                                                            <xsl:attribute name="{concat('alph-',$group2)}">
                                                                <xsl:value-of select="
                                                                    concat('|',translate($lastgroup2,' ','|'),'|')"/>
                                                            </xsl:attribute>
                                                            <span class="header-text">
                                                                <xsl:value-of select="$lastgroup2"/>
                                                            </span>
                                                            <!--xsl:call-template name="add-footnote">
                                                                <xsl:with-param name="item" select="/infl-data/order-table/order-item[@attname=$groupheader]"/>
                                                                </xsl:call-template-->
                                                        </xsl:element>               
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
                                                    <xsl:with-param name="context" select="$group3"/>
                                                    <xsl:with-param name="groupheader" select="$lastgroup3"/>
                                                    <xsl:with-param name="colgroup" select="$lastgroup1"/>
                                                </xsl:call-template>
                                            </tr> 
                                        </xsl:if>
                                    </xsl:for-each>
                                   
                                </xsl:if>
                            </xsl:for-each>                                  
                        </xsl:if>
                    </xsl:for-each>
            </xsl:otherwise>
        </xsl:choose>    
        </xsl:element><!-- end infl table -->
    </xsl:template>
    
    <!-- template to write a group of rows of infl-ending data to the table -->
    <xsl:template name="rowgroup">
        <xsl:param name="data"/>
        <xsl:param name="groupheader"/>
        <xsl:param name="colgroup"/>
        <xsl:param name="context"/>
        <xsl:variable name="group4_vals" select="//order-item[@attname=$group4]"/>
        <xsl:variable name="group5_vals" select="//order-item[@attname=$group5]"/>
        <!--td class="ending-group"--> <!-- start new cell -->
        <!---
            for each group4 (decl)
            for each group5 (gend)
            if the set doesn't have a match on group4 and group5 then print an empty cell
        -->
        <xsl:for-each select="$group4_vals">
            <xsl:sort 
                select="@order"/>
            <xsl:variable name="lastgroup4" select="."/>
            
            <xsl:if test="position()=1">
                <!-- add the row header cell if it's the first cell in 
                the row -->
                <xsl:element name="th">
                    <xsl:attribute name="class">rowgroupheader</xsl:attribute>
                    <xsl:attribute name="context"><xsl:value-of select="$context"/></xsl:attribute>
                    <xsl:attribute name="{concat('alph-',$context)}">
                        <xsl:value-of select="
                            concat('|',translate($groupheader,' ','|'),'|')"/>
                    </xsl:attribute>
                    <span class="header-text">
                        <xsl:value-of select="$groupheader"/>
                    </span>
                    <!--xsl:call-template name="add-footnote">
                        <xsl:with-param name="item" select="/infl-data/order-table/order-item[@attname=$groupheader]"/>
                    </xsl:call-template-->
                </xsl:element>
            </xsl:if>            
            <xsl:for-each select="$group5_vals">
                <xsl:sort select="@order"/> 
                <xsl:variable name="lastgroup5" select="."/>
                <xsl:variable name="celldata"
                    select="$data/@*[local-name(.)=$group4 
                    and .=$lastgroup4]/../@*[local-name(.)=$group5 
                    and . = $lastgroup5]/.."/>
                <!--xsl:choose>
                    <xsl:when test="count($celldata) = 0">
                        <td class="emptycell {$lastgroup4} {$lastgroup5}">&#160;</td>
                    </xsl:when>
                    <xsl:otherwise-->
                        <xsl:call-template name="ending-cell">
                            <xsl:with-param name="infl-endings" select="$celldata"/>
                            <xsl:with-param name="translit_ending_table_match" select="$translit_ending_table_match"/>
                            <xsl:with-param name="dedupe_by" select="$dedupe_by"/>
                            <xsl:with-param name="show_only_matches" select="$show_only_matches"/>
                            <xsl:with-param name="no_grouping" select="true()"/>
                            <xsl:with-param name="match_form" select="$match_form"/>
                        </xsl:call-template>
                    <!--/xsl:otherwise>
                </xsl:choose-->
            </xsl:for-each>
        </xsl:for-each>
    </xsl:template>
    
    <!-- template to produce header rows for the table columns -->    
    <xsl:template name="headers">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:param name="headerrow3"/>
        <xsl:variable name="row2count" select="count($headerrow2)"/>
        <tr id="filterrow">
            <th colspan="2">
                <span class="header-text"><xsl:value-of select="$filter_key"/></span> : 
                <span class="header-text"><xsl:value-of select="$filter_value"/></span>
            </th>
            <xsl:call-template name="headerrow">
                <xsl:with-param name="headerrow1" select="$headerrow1"/>
                <xsl:with-param name="headerrow2" select="$headerrow2"/>
                <xsl:with-param name="headerrow3" select="$headerrow3"/>
            </xsl:call-template>
        </tr>
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
                <xsl:element name="th">
                    <xsl:attribute name="colspan">
                        <xsl:value-of select="$row2count"/>
                    </xsl:attribute>
                    <xsl:attribute name="context">
                        <xsl:value-of select="$group4"/>
                    </xsl:attribute>                    
                    <xsl:attribute name="{concat('alph-',$group4)}">
                        <xsl:value-of select="
                            concat('|',translate(.,' ','|'),'|')"/>
                    </xsl:attribute>
                    <span class="header-text"><xsl:value-of select="."/></span>
                    <!--xsl:apply-templates select="."/-->
                </xsl:element>
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
                <xsl:variable name="lastgroup4" select="."/>
                <xsl:for-each select="$headerrow2">
                    <xsl:sort select="@order" data-type="number"/>
                    <xsl:element name="th">
                        <xsl:attribute name="colspan">
                            <xsl:value-of select="1"/>
                        </xsl:attribute>
                        <xsl:attribute name="context">
                            <xsl:value-of select="$group5"/>
                        </xsl:attribute>
                        <xsl:attribute name="{concat('alph-',$group5)}">
                            <xsl:value-of select="
                                concat('|',translate(.,' ','|'),'|')"/>
                        </xsl:attribute>
                        <xsl:attribute name="{concat('alph-',$group4)}">
                            <xsl:value-of select="
                                concat('|',translate($lastgroup4,' ','|'),'|')"/>
                        </xsl:attribute>
                        
                        <span class="header-text"><xsl:value-of select="."/></span>
                        <!--xsl:apply-templates select="."/-->
                    </xsl:element>
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
                            select="($row1pos * $row2count) + position() + 1"/>
                            <col class="header3col" realIndex="{$index}" 
                                row1pos="{$row1pos}"
                                row2pos="{$row2pos}"/>
                </xsl:for-each>
            </colgroup>
        </xsl:for-each>       
    </xsl:template>
    
    <xsl:template name="headerrow">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:variable name="row2count" select="count($headerrow2)"/>
        <xsl:for-each select="$headerrow1">
                <xsl:for-each select="$headerrow2">
                    <th class="emptyheader">&#160;</th>
                </xsl:for-each>
        </xsl:for-each>       
    </xsl:template>
    
    <xsl:template name="check_att">
        <xsl:param name="att_name"/>
        <xsl:param name="data"/>
        <!-- no need to repeat test on filtered attribute when matching inflections -->
        <xsl:if test="$att_name = $filter_key">1</xsl:if>
    </xsl:template>
    
</xsl:stylesheet>
